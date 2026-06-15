const db = require('../db/db');

// Controller para gerenciar as formas de pagamento
exports.renderPagamentos = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearias] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);
        
        // Busca as formas de pagamento
        const [pagamentos] = await db.query('SELECT * FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);

        res.render('admin/pagamentos', {
            usuario: req.session.userNome,
            barbearia: barbearias[0],
            pagamentos: pagamentos.length > 0 ? pagamentos[0] : {},
            paginaAtiva: 'pagamentos' // O nome exato que acende o menu na sidebar
        });
    } catch (error) {
        console.error("Erro ao carregar pagamentos:", error);
        res.status(500).send("Erro interno ao carregar pagamentos.");
    }
};

exports.salvarPagamentos = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    
    const dinheiro = req.body.dinheiro === 'on' ? 1 : 0;
    const credito = req.body.credito === 'on' ? 1 : 0;
    const debito = req.body.debito === 'on' ? 1 : 0;
    
    // Captura as chaves digitadas (ou null se estiver vazio)
    const mp_public_key = req.body.mp_public_key || null;
    const mp_access_token = req.body.mp_access_token || null;

    try {
        const [existe] = await db.query('SELECT id FROM formas_pagamento WHERE barbearia_id = ?', [barbeariaId]);

        if (existe.length > 0) {
            await db.query(
                'UPDATE formas_pagamento SET dinheiro = ?, credito = ?, debito = ?, mp_public_key = ?, mp_access_token = ? WHERE barbearia_id = ?',
                [dinheiro, credito, debito, mp_public_key, mp_access_token, barbeariaId]
            );
        } else {
            await db.query(
                'INSERT INTO formas_pagamento (barbearia_id, dinheiro, credito, debito, mp_public_key, mp_access_token) VALUES (?, ?, ?, ?, ?, ?)',
                [barbeariaId, dinheiro, credito, debito, mp_public_key, mp_access_token]
            );
        }
        
        res.redirect('/admin/pagamentos?sucesso=true');
    } catch (error) {
        console.error("Erro ao salvar pagamentos:", error);
        res.status(500).send("Erro ao salvar formas de pagamento.");
    }
};