const db = require('../db/db'); // Ou '../db/db'

exports.renderDashboard = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);

        // 1. QUERY: Cards de Resumo
        const queryResumo = `
            SELECT 
                COUNT(CASE WHEN DATE(data_hora) = CURDATE() AND status != 'cancelado' THEN 1 END) AS clientesHoje,
                COUNT(CASE WHEN DATE(data_hora) = CURDATE() + INTERVAL 1 DAY AND status != 'cancelado' THEN 1 END) AS agendamentosAmanha,
                COALESCE(SUM(CASE WHEN DATE(data_hora) = CURDATE() AND status IN ('concluido', 'pago') THEN valor_total ELSE 0 END), 0) AS ganhoHoje,
                COALESCE(SUM(CASE WHEN DATE(data_hora) = CURDATE() - INTERVAL 1 DAY AND status IN ('concluido', 'pago') THEN valor_total ELSE 0 END), 0) AS ganhoOntem
            FROM agendamentos 
            WHERE barbearia_id = ?;
        `;

        // 2. QUERY: Agenda de Hoje (Agora com o Produto incluído!)
        const queryHoje = `
            SELECT 
                a.id, 
                DATE_FORMAT(a.data_hora, '%H:%i') AS horario, 
                u.nome AS cliente_nome, 
                s.nome AS servico_nome, 
                p.nome AS produto_nome,
                a.valor_total, 
                a.status,
                a.forma_pagamento
            FROM agendamentos a
            LEFT JOIN usuarios u ON a.cliente_id = u.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN produtos p ON a.id_produto = p.id
            WHERE a.barbearia_id = ? AND DATE(a.data_hora) = CURDATE()
            ORDER BY a.data_hora ASC;
        `;

        // 3. QUERY: Faturamento por Forma de Pagamento
        const queryPagamentos = `
            SELECT 
                COALESCE(forma_pagamento, 'Não Informado') AS forma_pagamento, 
                SUM(valor_total) AS total 
            FROM agendamentos 
            WHERE barbearia_id = ? 
              AND MONTH(data_hora) = MONTH(CURDATE()) 
              AND YEAR(data_hora) = YEAR(CURDATE())
              AND status IN ('concluido', 'pago')
            GROUP BY COALESCE(forma_pagamento, 'Não Informado');
        `;

        // 4. QUERY: Gráfico de Clientes
        const queryGrafico = `
            SELECT 
                DATE_FORMAT(data_agendamento, '%d/%m') AS data_dia,
                total_clientes
            FROM (
                SELECT 
                    DATE(data_hora) AS data_agendamento, 
                    COUNT(id) AS total_clientes 
                FROM agendamentos 
                WHERE barbearia_id = ? 
                  AND data_hora >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                  AND status IN ('concluido', 'pago')
                GROUP BY DATE(data_hora)
            ) AS resumo_dias
            ORDER BY data_agendamento ASC;
        `;

        // 5. QUERY: Radar de Retenção
        const queryRetencao = `
            SELECT 
                u.nome AS cliente_nome,
                u.telefone AS cliente_telefone,
                DATEDIFF(CURDATE(), MAX(a.data_hora)) AS dias_ausente
            FROM agendamentos a
            JOIN usuarios u ON a.cliente_id = u.id
            WHERE a.barbearia_id = ? 
              AND a.status = 'concluido'
              AND u.id NOT IN (
                  SELECT DISTINCT cliente_id 
                  FROM agendamentos 
                  WHERE barbearia_id = ? AND data_hora >= NOW() AND status != 'cancelado'
              )
            GROUP BY u.id, u.nome, u.telefone
            HAVING dias_ausente >= 20 AND dias_ausente <= 45
            ORDER BY dias_ausente DESC
            LIMIT 4;
        `;

        // 6. NOVA QUERY: Produtos Vendidos no Mês (Para o Dashboard)
        const queryProdutosMes = `
            SELECT 
                p.nome AS produto_nome, 
                COUNT(a.id) AS qtd_vendida, 
                SUM(p.preco) AS total_gerado
            FROM agendamentos a
            JOIN produtos p ON a.id_produto = p.id
            WHERE a.barbearia_id = ? 
              AND MONTH(a.data_hora) = MONTH(CURDATE()) 
              AND YEAR(a.data_hora) = YEAR(CURDATE())
              AND a.status IN ('concluido', 'pago')
            GROUP BY p.id
            ORDER BY qtd_vendida DESC
            LIMIT 4;
        `;

        const [resumoData] = await db.query(queryResumo, [barbeariaId]);
        const [agendaHojeData] = await db.query(queryHoje, [barbeariaId]);
        const [pagamentosData] = await db.query(queryPagamentos, [barbeariaId]);
        const [graficoData] = await db.query(queryGrafico, [barbeariaId]);
        const [retencaoData] = await db.query(queryRetencao, [barbeariaId, barbeariaId]);
        const [produtosData] = await db.query(queryProdutosMes, [barbeariaId]); // Nova Query

        const resumo = resumoData[0] || { clientesHoje: 0, agendamentosAmanha: 0, ganhoHoje: 0, ganhoOntem: 0 };
        const formatarBRL = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        res.render('admin/dashboard', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'dashboard',
            stats: {
                clientesHoje: resumo.clientesHoje || 0,
                agendamentosAmanha: resumo.agendamentosAmanha || 0,
                ganhoHoje: formatarBRL(resumo.ganhoHoje),
                ganhoOntem: formatarBRL(resumo.ganhoOntem)
            },
            agendaHoje: agendaHojeData,
            pagamentos: pagamentosData.map(p => ({ 
                nome: p.forma_pagamento, 
                total: formatarBRL(p.total)
            })),
            produtosVendidos: produtosData, // Enviado para a view
            dadosGrafico: graficoData,
            clientesAusentes: retencaoData 
        });

    } catch (error) {
        console.error("🔥 Erro no Dashboard Admin:", error.message);
        res.status(500).send("Erro ao carregar o painel.");
    }
};