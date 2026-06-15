const db = require('../db/db');

exports.getNotificacoes = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        if (!barbeariaId) return res.json({ notificacoes: [] });

        // Busca os 5 agendamentos mais recentes (pela data em que foram criados)
        const query = `
            SELECT 
                a.id, 
                a.data_hora, 
                a.created_at, 
                u.nome AS cliente_nome, 
                s.nome AS servico_nome
            FROM agendamentos a
            JOIN usuarios u ON a.cliente_id = u.id
            JOIN servicos s ON a.servico_id = s.id
            WHERE a.barbearia_id = ?
            ORDER BY a.created_at DESC
            LIMIT 5
        `;
        const [notificacoes] = await db.query(query, [barbeariaId]);

        res.json({ notificacoes });
    } catch (error) {
        console.error("Erro nas notificações:", error);
        res.status(500).json({ erro: "Erro ao buscar notificações" });
    }
};