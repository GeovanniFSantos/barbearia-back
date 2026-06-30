const db = require('../db/db'); 

// Renderiza a Home (Vitrine do Cliente)
exports.renderHomeBarbearia = async (req, res) => {
    try {
        const barbeariaId = 1; // FIXO NA BARBEARIA ÚNICA

        const [barbearias] = await db.query('SELECT * FROM barbearias WHERE id = ? AND status != "inativo"', [barbeariaId]);
        if (barbearias.length === 0) return res.status(404).send("<h1>Barbearia não encontrada no sistema.</h1>");
        const barbearia = barbearias[0];

        const [servicos] = await db.query('SELECT * FROM servicos WHERE barbearia_id = ? ORDER BY nome ASC', [barbeariaId]);
        const [equipe] = await db.query('SELECT id, nome FROM usuarios WHERE barbearia_id = ? AND tipo IN ("dono", "colaborador")', [barbeariaId]);
        const [pagamentos] = await db.query('SELECT * FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);
        const [enderecos] = await db.query('SELECT * FROM enderecos_barbearia WHERE barbearia_id = ?', [barbeariaId]);
        const [produtos] = await db.query('SELECT * FROM produtos WHERE barbearia_id = ? AND quantidade_estoque > 0 ORDER BY nome ASC', [barbeariaId]);

        res.render('cliente/home', {
            barbearia: barbearia,
            servicos: servicos,
            equipe: equipe,
            produtos: produtos, 
            pagamentos: pagamentos.length > 0 ? pagamentos[0] : null,
            endereco: enderecos.length > 0 ? enderecos[0] : null,
            clienteLogado: req.session.userId ? true : false, 
            nomeCliente: req.session.userNome || null,
            mpPublicKey: pagamentos && pagamentos.length > 0 ? pagamentos[0].mp_public_key : null
        });
    } catch (error) {
        console.error("Erro na vitrine:", error);
        res.status(500).send("Erro interno ao carregar a página.");
    }
};

// Processa o Agendamento
exports.realizarAgendamento = async (req, res) => {
    const barbeariaId = 1; // FIXO
    const { servico_id, colaborador_id, data_hora, forma_pagamento, cupom_id, id_produto } = req.body;
    const cliente_id = req.session.userId; 

    try {
        const [servicos] = await db.query('SELECT preco FROM servicos WHERE id = ? AND barbearia_id = ?', [servico_id, barbeariaId]);
        if (servicos.length === 0) return res.status(400).send("Serviço inválido.");
        
        let valorTotal = Number(servicos[0].preco);
        let produtoIdInsert = null;

        // Venda de Produto
        if (id_produto) {
            const [produto] = await db.query('SELECT preco, quantidade_estoque FROM produtos WHERE id = ? AND barbearia_id = ?', [id_produto, barbeariaId]);
            if (produto.length > 0 && produto[0].quantidade_estoque > 0) {
                valorTotal += Number(produto[0].preco);
                produtoIdInsert = id_produto;
                await db.query('UPDATE produtos SET quantidade_estoque = quantidade_estoque - 1 WHERE id = ?', [id_produto]);
            }
        }

        // Lógica do Cupom
        let cupomAplicadoId = null;
        if (cupom_id) {
            const [cupons] = await db.query('SELECT * FROM cupons WHERE id = ? AND barbearia_id = ? AND ativo = 1', [cupom_id, barbeariaId]);
            if (cupons.length > 0) {
                const cupom = cupons[0];
                cupomAplicadoId = cupom.id;
                
                if (cupom.tipo === 'percentual') {
                    valorTotal = valorTotal - (valorTotal * (Number(cupom.valor) / 100));
                } else {
                    valorTotal = valorTotal - Number(cupom.valor);
                }
                if (valorTotal < 0) valorTotal = 0;
            }
        }

        await db.query(
            `INSERT INTO agendamentos (barbearia_id, cliente_id, colaborador_id, servico_id, id_produto, data_hora, status, forma_pagamento, valor_total, cupom_id)
             VALUES (?, ?, ?, ?, ?, ?, 'agendado', ?, ?, ?)`,
            [barbeariaId, cliente_id, colaborador_id, servico_id, produtoIdInsert, data_hora, forma_pagamento || 'pendente', valorTotal, cupomAplicadoId]
        );

        res.redirect(`/barbearia/?sucesso=true`); // Retorna para a raiz
    } catch (error) {
        console.error("Erro ao agendar:", error);
        res.status(500).send("Erro interno ao processar agendamento.");
    }
};

// Lista os agendamentos do cliente logado
exports.listarMeusAgendamentos = async (req, res) => {
    const clienteId = req.session.userId;
    const barbeariaId = 1; // FIXO

    try {
        const query = `
            SELECT a.id, a.data_hora, a.status, a.valor_total,
                   b.nome as barbearia_nome, b.slug as barbearia_slug, b.telefone as barbearia_telefone,
                   s.nome as servico_nome,
                   colab.nome as profissional_nome
            FROM agendamentos a
            JOIN barbearias b ON a.barbearia_id = b.id
            JOIN servicos s ON a.servico_id = s.id
            JOIN usuarios colab ON a.colaborador_id = colab.id
            WHERE a.cliente_id = ?
            ORDER BY a.data_hora DESC
        `;
        const [agendamentos] = await db.query(query, [clienteId]);

        const [barbearias] = await db.query('SELECT nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);

        res.render('cliente/meus_agendamentos', {
            agendamentos: agendamentos,
            nomeCliente: req.session.userNome,
            clienteLogado: true,
            barbearia: barbearias.length > 0 ? barbearias[0] : { slug: '', nome: 'Vitrine' } 
        });
    } catch (error) {
        console.error("Erro ao carregar meus agendamentos:", error.message);
        res.status(500).send("Erro ao carregar sua agenda.");
    }
};

// Exibe a tela de perfil
exports.renderPerfil = async (req, res) => {
    const clienteId = req.session.userId;
    const barbeariaId = 1; // FIXO

    try {
        const [usuarios] = await db.query('SELECT nome, email, telefone FROM usuarios WHERE id = ?', [clienteId]);
        
        if (usuarios.length === 0) return res.redirect('/auth/login');

        const [barbearias] = await db.query('SELECT slug FROM barbearias WHERE id = ?', [barbeariaId]);

        res.render('cliente/perfil', {
            cliente: usuarios[0],
            nomeCliente: req.session.userNome,
            clienteLogado: true,
            barbearia: barbearias.length > 0 ? barbearias[0] : { slug: '' }
        });
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        res.status(500).send("Erro interno ao carregar perfil.");
    }
};

// Salva as alterações do perfil
exports.atualizarPerfil = async (req, res) => {
    const clienteId = req.session.userId;
    const { nome, telefone } = req.body;

    try {
        await db.query(
            'UPDATE usuarios SET nome = ?, telefone = ? WHERE id = ?',
            [nome, telefone, clienteId]
        );
        req.session.userNome = nome;
        res.redirect('/barbearia-app/meu-perfil?sucesso=true');
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).send("Erro ao atualizar dados.");
    }
};