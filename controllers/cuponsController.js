const db = require('../db/db');

exports.listarCupons = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearias] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);
        
        // Busca os cupons cadastrados
        const [cupons] = await db.query('SELECT * FROM cupons WHERE barbearia_id = ? ORDER BY id DESC', [barbeariaId]);

        res.render('admin/cupons', {
            usuario: req.session.userNome,
            barbearia: barbearias[0],
            cupons: cupons,
            paginaAtiva: 'cupons' // Acende a aba correspondente no menu
        });
    } catch (error) {
        console.error("Erro ao listar cupons:", error);
        res.status(500).send("Erro interno ao carregar cupons.");
    }
};

exports.criarCupom = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const { codigo, tipo, valor, data_validade } = req.body;

    try {
        // Formata o código para ficar tudo em MAIÚSCULO e sem espaços
        const codigoFormatado = codigo.toUpperCase().trim().replace(/\s+/g, '');

        await db.query(
            'INSERT INTO cupons (barbearia_id, codigo, tipo, valor, data_validade, ativo) VALUES (?, ?, ?, ?, ?, ?)',
            [barbeariaId, codigoFormatado, tipo, valor, data_validade || null, true]
        );
        res.redirect('/barbearia-app/admin/cupons?sucesso=true');
    } catch (error) {
        console.error("Erro ao criar cupom:", error);
        res.status(500).send("Erro ao salvar cupom.");
    }
};

exports.excluirCupom = async (req, res) => {
    const { id } = req.params;
    const barbeariaId = req.session.barbeariaId;

    try {
        await db.query('DELETE FROM cupons WHERE id = ? AND barbearia_id = ?', [id, barbeariaId]);
        res.redirect('/barbearia-app/admin/cupons');
    } catch (error) {
        console.error("Erro ao excluir cupom:", error);
        res.status(500).send("Erro ao excluir cupom.");
    }
};

exports.alternarStatus = async (req, res) => {
    const { id } = req.params;
    const barbeariaId = req.session.barbeariaId;

    try {
        // Busca o status atual e inverte
        const [cupom] = await db.query('SELECT ativo FROM cupons WHERE id = ? AND barbearia_id = ?', [id, barbeariaId]);
        if (cupom.length > 0) {
            const novoStatus = cupom[0].ativo ? 0 : 1;
            await db.query('UPDATE cupons SET ativo = ? WHERE id = ? AND barbearia_id = ?', [novoStatus, id, barbeariaId]);
        }
        res.redirect('/barbearia-app/admin/cupons');
    } catch (error) {
        console.error("Erro ao alterar status:", error);
        res.status(500).send("Erro ao alterar status do cupom.");
    }
};