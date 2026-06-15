const db = require('../db/db');

// Renderiza o painel com os dados e a tabela real do banco
exports.renderDashboard = async (req, res) => {
    try {
        const nomeLogado = req.session.userNome || 'Administrador';

        const [contagem] = await db.query('SELECT COUNT(*) as total FROM barbearias');
        const total = contagem[0].total;

        const [barbearias] = await db.query('SELECT * FROM barbearias ORDER BY created_at DESC');

        res.render('superadmin/dashboard', {
            nome: nomeLogado,
            totalBarbearias: total,
            faturamento: `R$ ${(total * 99.90).toFixed(2)}`,
            barbearias: barbearias 
        });
    } catch (error) {
        console.error("Erro ao carregar dados do SuperAdmin:", error.message);
        res.status(500).send("Erro interno no servidor.");
    }
};

// Cadastra uma nova barbearia
exports.cadastrarBarbearia = async (req, res) => {
    const { nome, slug, telefone, status } = req.body;
    try {
        await db.query(
            'INSERT INTO barbearias (nome, slug, telefone, status) VALUES (?, ?, ?, ?)',
            [nome, slug, telefone, status]
        );
        res.redirect('/superadmin');
    } catch (error) {
        console.error("Erro ao inserir barbearia:", error.message);
        if(error.code === 'ER_DUP_ENTRY') {
            return res.send("<script>alert('Esse Slug já está em uso!'); window.history.back();</script>");
        }
        res.status(500).send("Erro ao salvar no banco.");
    }
};

// Altera o status da barbearia (Ativar / Desativar)
exports.alternarStatus = async (req, res) => {
    const { id, statusAtual } = req.params;
    const novoStatus = statusAtual === 'ativo' ? 'inativo' : 'ativo';

    try {
        await db.query('UPDATE barbearias SET status = ? WHERE id = ?', [novoStatus, id]);
        res.redirect('/superadmin');
    } catch (error) {
        console.error("Erro ao alterar status:", error.message);
        res.status(500).send("Erro ao alterar status.");
    }
};