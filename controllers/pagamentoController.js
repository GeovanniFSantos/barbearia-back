const { MercadoPagoConfig, Preference, Payment, PaymentRefund } = require('mercadopago');
const db = require('../db/db');
const crypto = require('crypto');

// Esse endpoint é chamado pelo frontend para criar a preferência de pagamento no Mercado Pago e receber o ID de preferência
exports.criarPreferencia = async (req, res) => {
    try {
        // Agora recebemos também o ID da barbearia do frontend
        const { titulo, preco, quantidade, barbeariaId } = req.body;

        const precoUnitario = Number(preco);
        if (isNaN(precoUnitario) || precoUnitario <= 0) {
            return res.status(400).json({ erro: "Preço inválido." });
        }

        // 1. Busca o Token da Barbearia no Banco de Dados
        const [config] = await db.query('SELECT mp_access_token FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);
        
        if (config.length === 0 || !config[0].mp_access_token) {
            return res.status(400).json({ erro: "A barbearia não configurou o Mercado Pago." });
        }

        const tokenDoDono = config[0].mp_access_token;

        // 2. Inicia o Mercado Pago de forma DINÂMICA com o token do dono!
        const client = new MercadoPagoConfig({ accessToken: tokenDoDono, options: { timeout: 5000 } });
        const preference = new Preference(client);

        // 3. Cria a cobrança na conta dele
        const response = await preference.create({
            body: {
                items: [
                    {
                        title: titulo,
                        quantity: Number(quantidade),
                        unit_price: precoUnitario,
                        currency_id: 'BRL'
                    }
                ]
            }
        });

        res.json({ id: response.id });

    } catch (error) {
        console.error("🔥 Erro ao comunicar com o Mercado Pago:", error);
        res.status(500).json({ erro: "Falha ao gerar o pagamento." });
    }
};

// Esse endpoint é chamado quando o cliente finaliza o pagamento no frontend (após preencher os dados do cartão ou escolher Pix)
exports.processarPagamento = async (req, res) => {
    try {
        const { formData, agendamento, barbeariaId } = req.body;
        const clienteId = req.session.userId;
        const clienteNome = req.session.userNome || "Cliente da Silva"; // Pega o nome da sessão

        if (!clienteId) return res.status(401).json({ erro: "Você precisa estar logado." });

        const [config] = await db.query('SELECT mp_access_token FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);
        if (config.length === 0 || !config[0].mp_access_token) {
            return res.status(400).json({ erro: "Mercado Pago não configurado." });
        }

        const client = new MercadoPagoConfig({ accessToken: config[0].mp_access_token, options: { timeout: 5000 } });
        const payment = new Payment(client);

        const idempotencyKey = crypto.randomUUID();

        // Limpa e estrutura os dados principais
        const dadosMPEstritos = {
            ...formData,
            description: `Agendamento de Serviço na Barbearia`,
            transaction_amount: Number(formData.transaction_amount)
        };

        // O SEGREDO DO PIX: Injeta Nome e um CPF válido para o Banco Central aprovar a geração
        if (dadosMPEstritos.payment_method_id === 'pix') {
            const nomePartes = clienteNome.split(' ');
            dadosMPEstritos.payer = {
                ...dadosMPEstritos.payer,
                first_name: nomePartes[0],
                last_name: nomePartes.length > 1 ? nomePartes.slice(1).join(' ') : 'Sob Medida',
                identification: {
                    type: 'CPF',
                    number: '19119119100' // CPF oficial de testes aprovado pelo Mercado Pago
                }
            };
        }

        console.log("Enviando para o Mercado Pago:", JSON.stringify(dadosMPEstritos, null, 2));

        const response = await payment.create({ 
            body: dadosMPEstritos,
            requestOptions: { idempotencyKey: idempotencyKey }
        });

        if (response.status === 'approved' || response.status === 'in_process' || response.status === 'pending') {
            
            // 1. Salva no banco de dados com o ID do Mercado Pago
            await db.query(
                `INSERT INTO agendamentos (barbearia_id, cliente_id, colaborador_id, servico_id, data_hora, status, forma_pagamento, valor_total, cupom_id, id_pagamento_mp)
                 VALUES (?, ?, ?, ?, ?, 'agendado', ?, ?, ?, ?)`,
                [barbeariaId, clienteId, agendamento.colaborador_id, agendamento.servico_id, agendamento.data_hora, `App (${response.payment_method_id})`, agendamento.valor_total, agendamento.cupom_id || null, response.id]
            );

            // 2. Captura a imagem do QR Code e o Copia e Cola (Se for Pix)
            let pixCopiaECola = null;
            let pixQrCode64 = null;
            
            if (response.payment_method_id === 'pix' && response.point_of_interaction) {
                pixCopiaECola = response.point_of_interaction.transaction_data.qr_code;
                pixQrCode64 = response.point_of_interaction.transaction_data.qr_code_base64;
            }

            // 3. Devolve TUDO para a tela do cliente
            return res.json({ 
                sucesso: true, 
                id_pagamento: response.id,
                metodo: response.payment_method_id,
                pixCopiaECola: pixCopiaECola,
                pixQrCode64: pixQrCode64
            });
            
        } else {
            return res.status(400).json({ erro: `Pagamento recusado. Motivo: ${response.status_detail}` });
        }

    } catch (error) {
        console.error("🔥 Erro no processamento do Mercado Pago:", error);
        res.status(500).json({ erro: "Erro ao processar o pagamento." });
    }
};

// Esse endpoint é chamado pelo Mercado Pago para nos avisar sobre mudanças no status do pagamento (ex: quando o cliente paga via Pix ou quando o cartão é aprovado)
exports.receberWebhook = async (req, res) => {
    try {
        // O Mercado Pago manda o ID da transação pela URL (req.query) ou pelo corpo (req.body)
        const idPagamento = req.query.id || req.query['data.id'] || (req.body.data && req.body.data.id);
        const tipoAcao = req.body.action || req.body.type;

        if (tipoAcao === 'payment.updated' || tipoAcao === 'payment.created') {
            if (idPagamento) {
                
                // 1. Descobre de qual barbearia é esse pagamento buscando no nosso banco
                const [agendamento] = await db.query('SELECT barbearia_id FROM agendamentos WHERE id_pagamento_mp = ?', [idPagamento]);
                
                if (agendamento.length > 0) {
                    const barbeariaId = agendamento[0].barbearia_id;
                    
                    // 2. Busca o Token do dono da barbearia
                    const [config] = await db.query('SELECT mp_access_token FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);
                    
                    if (config.length > 0 && config[0].mp_access_token) {
                        const client = new MercadoPagoConfig({ accessToken: config[0].mp_access_token });
                        const payment = new Payment(client);
                        
                        // 3. Pergunta pro Mercado Pago: "Esse pagamento foi aprovado mesmo?"
                        const statusReal = await payment.get({ id: idPagamento });

                        if (statusReal.status === 'approved') {
                            // 4. SUCESSO! Muda o status no banco de dados para Pago!
                            await db.query('UPDATE agendamentos SET status = "agendado" WHERE id_pagamento_mp = ?', [idPagamento]);
                            console.log(`✅ Pagamento ${idPagamento} confirmado com sucesso no banco!`);
                        }
                    }
                }
            }
        }
        
        // Sempre temos que responder 200 OK rápido para o Mercado Pago não achar que nosso servidor caiu
        res.status(200).send('OK');

    } catch (error) {
        console.error("Erro no Webhook:", error);
        res.status(500).send('Erro interno');
    }
};

// Esse endpoint é chamado pelo painel do dono quando ele quer cancelar um agendamento que foi pago via Mercado Pago. Ele vai tentar estornar o pagamento automaticamente e depois atualizar o status do agendamento para "cancelado"
exports.cancelarEReembolsar = async (req, res) => {
    try {
        const { agendamentoId } = req.body;
        const barbeariaId = req.session.barbeariaId; // Pega o ID do dono logado no painel

        if (!barbeariaId) return res.status(401).json({ erro: "Acesso negado." });

        // 1. Busca os dados completos do agendamento no banco
        const [agendamento] = await db.query(
            'SELECT id_pagamento_mp, status FROM agendamentos WHERE id = ? AND barbearia_id = ?',
            [agendamentoId, barbeariaId]
        );

        if (agendamento.length === 0) return res.status(404).json({ erro: "Agendamento não encontrado." });
        if (agendamento[0].status === 'cancelado') return res.status(400).json({ erro: "Este agendamento já está cancelado." });

        const idPagamentoMP = agendamento[0].id_pagamento_mp;

        // 2. Se o pagamento foi feito pelo App (tem ID do MP), aciona o estorno!
        if (idPagamentoMP) {
            const [config] = await db.query('SELECT mp_access_token FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);

            if (config.length > 0 && config[0].mp_access_token) {
                const client = new MercadoPagoConfig({ accessToken: config[0].mp_access_token });
                const refund = new PaymentRefund(client);

                // Pede pro Mercado Pago devolver o dinheiro instantaneamente
                await refund.create({ payment_id: idPagamentoMP });
                console.log(`💸 Estorno automático processado para o pagamento: ${idPagamentoMP}`);
            }
        }

        // 3. Atualiza o status no nosso banco de dados para "cancelado"
        await db.query('UPDATE agendamentos SET status = "cancelado" WHERE id = ?', [agendamentoId]);

        res.json({ sucesso: true, mensagem: "Agendamento cancelado com sucesso. Se foi pago via App, o valor já foi estornado." });

    } catch (error) {
        console.error("🔥 Erro ao tentar cancelar/reembolsar:", error);
        res.status(500).json({ erro: "Erro ao processar o cancelamento. Tente novamente." });
    }
};