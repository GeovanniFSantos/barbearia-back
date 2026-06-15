const db = require('../db/db');

exports.listarClientes = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);

        // Query Avançada de CRM: Traz o cliente + Total Gasto + Última Visita + Próxima Visita
        const query = `
            SELECT 
                u.id, 
                u.nome, 
                u.email, 
                u.telefone,
                COUNT(a.id) AS total_cortes,
                SUM(CASE WHEN a.status IN ('concluido', 'pago') THEN a.valor_total ELSE 0 END) AS total_gasto,
                MAX(CASE WHEN a.data_hora < NOW() THEN a.data_hora END) AS ultima_visita,
                MIN(CASE WHEN a.data_hora >= NOW() AND a.status != 'cancelado' THEN a.data_hora END) AS proxima_visita
            FROM usuarios u
            JOIN agendamentos a ON u.id = a.cliente_id
            WHERE a.barbearia_id = ?
            GROUP BY u.id, u.nome, u.email, u.telefone
            ORDER BY u.nome ASC
        `;
        
        const [clientesData] = await db.query(query, [barbeariaId]);

        // Função para formatar datas no padrão DD/MM/YYYY às HH:MM
        const formatarData = (dataSQL) => {
            if (!dataSQL) return null;
            const d = new Date(dataSQL);
            return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        };

        // Formata os dados antes de enviar para a tela
        const clientesFormatados = clientesData.map(c => ({
            ...c,
            telefone_formatado: c.telefone || 'Não informado',
            total_gasto_formatado: Number(c.total_gasto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            ultima_visita_formatada: formatarData(c.ultima_visita) || 'Nenhuma visita concluída',
            proxima_visita_formatada: formatarData(c.proxima_visita) || 'Nenhum agendamento futuro'
        }));

        res.render('admin/clientes', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'clientes',
            clientes: clientesFormatados
        });
    } catch (error) {
        console.error("🔥 Erro ao carregar clientes:", error.message);
        res.status(500).send("Erro interno ao carregar clientes.");
    }
};