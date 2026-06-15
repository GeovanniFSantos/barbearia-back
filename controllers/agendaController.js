const db = require('../db/db');

// Renderiza a página da agenda alimentando a tabela e os selects do modal
exports.listarAgenda = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        
        let dataFiltro = req.query.data; 
        if (!dataFiltro) {
            const hoje = new Date();
            hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
            dataFiltro = hoje.toISOString().split('T')[0];
        }

        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);

        // ATUALIZADO: Busca também o nome do produto através do LEFT JOIN
        const queryAgendamentos = `
            SELECT a.*, 
                c.nome AS cliente_nome, 
                s.nome AS servico_nome, 
                u.nome AS profissional_nome,
                p.nome AS produto_nome,
                cup.codigo AS cupom_codigo
            FROM agendamentos a
            JOIN usuarios c ON a.cliente_id = c.id
            JOIN servicos s ON a.servico_id = s.id
            JOIN usuarios u ON a.colaborador_id = u.id
            LEFT JOIN produtos p ON a.id_produto = p.id
            LEFT JOIN cupons cup ON a.cupom_id = cup.id
            WHERE a.barbearia_id = ? AND DATE(a.data_hora) = ?
            ORDER BY a.data_hora ASC
        `;
        const [agendamentos] = await db.query(queryAgendamentos, [barbeariaId, dataFiltro]);

        const [servicos] = await db.query('SELECT id, nome, preco FROM servicos WHERE barbearia_id = ? ORDER BY nome ASC', [barbeariaId]);
        const [colaboradores] = await db.query('SELECT id, nome FROM usuarios WHERE barbearia_id = ? AND tipo IN ("colaborador", "dono") ORDER BY nome ASC', [barbeariaId]);
        const [clientes] = await db.query('SELECT id, nome FROM usuarios WHERE tipo = "cliente" ORDER BY nome ASC');
        
        // NOVO: Busca apenas produtos que têm estoque para vender
        const [produtos] = await db.query('SELECT id, nome, preco FROM produtos WHERE barbearia_id = ? AND quantidade_estoque > 0 ORDER BY nome ASC', [barbeariaId]);

        res.render('admin/agenda', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'agenda',
            agendamentos: agendamentos,
            servicos: servicos,
            colaboradores: colaboradores,
            clientes: clientes,
            produtos: produtos, // Passamos os produtos para a View
            dataFiltro: dataFiltro 
        });
    } catch (error) {
        console.error("🔥 Erro ao carregar dados da agenda:", error.message);
        res.status(500).send("Erro interno ao carregar a agenda.");
    }
};

// Processa o envio do formulário do modal e cria o agendamento no banco
exports.criarAgendamento = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const { cliente_id, colaborador_id, servico_id, data_hora, id_produto } = req.body; // Recebe o id_produto

    try {
        const [servico] = await db.query('SELECT preco FROM servicos WHERE id = ? AND barbearia_id = ?', [servico_id, barbeariaId]);
        if (servico.length === 0) return res.status(400).send("Serviço selecionado é inválido.");

        let valorTotal = Number(servico[0].preco);
        let produtoIdInsert = null;

        // NOVO: Se o barbeiro selecionou um produto no encaixe, soma o valor e baixa o estoque
        if (id_produto) {
            const [produto] = await db.query('SELECT preco, quantidade_estoque FROM produtos WHERE id = ? AND barbearia_id = ?', [id_produto, barbeariaId]);
            if (produto.length > 0 && produto[0].quantidade_estoque > 0) {
                valorTotal += Number(produto[0].preco);
                produtoIdInsert = id_produto;
                
                // Dá baixa no estoque
                await db.query('UPDATE produtos SET quantidade_estoque = quantidade_estoque - 1 WHERE id = ?', [id_produto]);
            }
        }

        // Insere o agendamento com o id_produto
        await db.query(
            `INSERT INTO agendamentos (barbearia_id, cliente_id, colaborador_id, servico_id, id_produto, data_hora, status, forma_pagamento, valor_total)
             VALUES (?, ?, ?, ?, ?, ?, 'agendado', 'pendente', ?)`,
            [barbeariaId, cliente_id, colaborador_id, servico_id, produtoIdInsert, data_hora, valorTotal]
        );

        res.redirect('/admin/agenda');
    } catch (error) {
        console.error("Erro ao criar agendamento manual:", error.message);
        res.status(500).send("Erro ao salvar agendamento no sistema.");
    }
};

// Atualiza o status do agendamento (concluído, cancelado, etc.) via link na tabela
exports.atualizarStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.query; 
    const barbeariaId = req.session.barbeariaId;

    try {
        await db.query(
            'UPDATE agendamentos SET status = ? WHERE id = ? AND barbearia_id = ?',
            [status, id, barbeariaId]
        );
        res.redirect('/admin/agenda');
    } catch (error) {
        console.error("🔥 Erro ao atualizar status no Banco de Dados:", error);
        res.status(500).send(`Erro interno: ${error.message}`);
    }
};