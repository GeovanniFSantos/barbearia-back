const db = require('../db/db');

exports.renderRelatorios = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        if (!barbeariaId) return res.redirect('/auth/login');

        let mesFiltro = req.query.mesFiltro;
        if (!mesFiltro) {
            const dataHoje = new Date();
            mesFiltro = `${dataHoje.getFullYear()}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}`;
        }

        // 1. Evolução do Faturamento
        const queryFaturamento = `
            SELECT 
                DATE_FORMAT(data_hora, '%Y-%m') AS mes_ano,
                SUM(valor_total) AS total_faturado,
                COUNT(id) AS qtd_agendamentos
            FROM agendamentos
            WHERE barbearia_id = ? AND status IN ('concluido', 'pago')
            GROUP BY mes_ano
            ORDER BY mes_ano DESC
            LIMIT 6;
        `;

        // 2. Barbeiros que mais atenderam
        const queryBarbeiros = `
            SELECT 
                u.nome AS profissional_nome,
                COUNT(a.id) AS total_atendimentos,
                SUM(a.valor_total) AS faturamento_gerado
            FROM agendamentos a
            JOIN usuarios u ON a.colaborador_id = u.id
            WHERE a.barbearia_id = ? AND a.status IN ('concluido', 'pago')
            AND DATE_FORMAT(a.data_hora, '%Y-%m') = ?
            GROUP BY a.colaborador_id
            ORDER BY total_atendimentos DESC;
        `;

        // 3. Serviços mais populares (Calcula o valor com base no preço original do serviço)
        const queryServicos = `
            SELECT 
                s.nome AS servico_nome,
                COUNT(a.id) AS total_vendas,
                SUM(s.preco) AS faturamento_servico
            FROM agendamentos a
            JOIN servicos s ON a.servico_id = s.id
            WHERE a.barbearia_id = ? AND a.status IN ('concluido', 'pago')
            AND DATE_FORMAT(a.data_hora, '%Y-%m') = ?
            GROUP BY a.servico_id
            ORDER BY total_vendas DESC
            LIMIT 5;
        `;

        // 4. NOVO: Produtos mais vendidos no mês
        const queryProdutosVendidos = `
            SELECT 
                p.nome AS produto_nome,
                COUNT(a.id) AS total_vendas,
                SUM(p.preco) AS faturamento_produto
            FROM agendamentos a
            JOIN produtos p ON a.id_produto = p.id
            WHERE a.barbearia_id = ? AND a.status IN ('concluido', 'pago')
            AND DATE_FORMAT(a.data_hora, '%Y-%m') = ?
            GROUP BY a.id_produto
            ORDER BY total_vendas DESC
            LIMIT 5;
        `;

        // 5. NOVO: Posição de Estoque Global
        const queryEstoque = `
            SELECT 
                nome AS produto_nome,
                quantidade_estoque,
                preco AS produto_preco
            FROM produtos
            WHERE barbearia_id = ?
            ORDER BY quantidade_estoque ASC
            LIMIT 6;
        `;

        const [barbearias] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);

        const [faturamentoData] = await db.query(queryFaturamento, [barbeariaId]);
        const [barbeirosData] = await db.query(queryBarbeiros, [barbeariaId, mesFiltro]);
        const [servicosData] = await db.query(queryServicos, [barbeariaId, mesFiltro]);
        const [produtosVendidosData] = await db.query(queryProdutosVendidos, [barbeariaId, mesFiltro]);
        const [estoqueData] = await db.query(queryEstoque, [barbeariaId]);

        const formatarMes = (mesAno) => {
            const [ano, mes] = mesAno.split('-');
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            return `${meses[parseInt(mes) - 1]}/${ano}`;
        };

        const faturamentoFormatado = faturamentoData.map(f => ({
            mes: formatarMes(f.mes_ano),
            total: Number(f.total_faturado).toFixed(2),
            qtd: f.qtd_agendamentos
        }));

        res.render('admin/relatorios', {
            faturamento: faturamentoFormatado,
            barbeiros: barbeirosData,
            servicos: servicosData,
            produtosVendidos: produtosVendidosData, // Top Produtos no Mês
            produtosEstoque: estoqueData,           // Alerta de Estoque Global
            mesFiltro: mesFiltro,
            usuario: req.session.userNome,     
            barbearia: barbearias[0],            
            paginaAtiva: 'relatorios'            
        });

    } catch (error) {
        console.error("🔥 Erro ao gerar relatórios:", error);
        res.status(500).send("Erro interno ao carregar os relatórios.");
    }
};