const db = require('../db/db');

// Renderiza a lista de serviços
exports.listarServicos = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);
        
        const [servicos] = await db.query('SELECT * FROM servicos WHERE barbearia_id = ? ORDER BY nome ASC', [barbeariaId]);

        res.render('admin/servicos', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'servicos',
            servicos: servicos
        });
    } catch (error) {
        console.error("Erro ao carregar serviços:", error.message);
        res.status(500).send("Erro interno.");
    }
};

// Cadastra um novo serviço
exports.cadastrarServico = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const { nome, descricao, preco, duracao_minutos } = req.body;

    try {
        await db.query(
            'INSERT INTO servicos (barbearia_id, nome, descricao, preco, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
            [barbeariaId, nome, descricao, preco, duracao_minutos]
        );
        res.redirect('/admin/servicos');
    } catch (error) {
        console.error("Erro ao cadastrar serviço:", error.message);
        res.status(500).send("Erro ao salvar serviço no banco.");
    }
};

// Excluir Serviço
exports.excluirServico = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM servicos WHERE id = ? AND barbearia_id = ?', [id, req.session.barbeariaId]);
        res.redirect('/admin/servicos');
    } catch (error) {
        console.error("Erro ao excluir serviço:", error.message);
        res.status(500).send("Erro ao excluir.");
    }
};

// Editar Serviço
exports.editarServico = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, preco, duracao_minutos } = req.body;
    try {
        await db.query(
            'UPDATE servicos SET nome = ?, descricao = ?, preco = ?, duracao_minutos = ? WHERE id = ? AND barbearia_id = ?',
            [nome, descricao, preco, duracao_minutos, id, req.session.barbeariaId]
        );
        res.redirect('/admin/servicos');
    } catch (error) {
        console.error("Erro ao editar serviço:", error.message);
        res.status(500).send("Erro ao editar.");
    }
};