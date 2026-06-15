const db = require('../db/db');
const bcrypt = require('bcrypt');

// Renderiza a lista de colaboradores
// Renderiza a lista de colaboradores com Faturamento
exports.listarColaboradores = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);
        
        // QUERY AVANÇADA: Traz o colaborador + Soma de Faturamentos (Hoje, Semana, Mês, Ano)
        const query = `
            SELECT 
                u.id, u.nome, u.email, u.telefone,
                COUNT(CASE WHEN MONTH(a.data_hora) = MONTH(CURDATE()) AND YEAR(a.data_hora) = YEAR(CURDATE()) AND a.status IN ('concluido', 'pago') THEN a.id END) AS cortes_mes,
                COALESCE(SUM(CASE WHEN DATE(a.data_hora) = CURDATE() AND a.status IN ('concluido', 'pago') THEN a.valor_total ELSE 0 END), 0) AS faturamento_hoje,
                COALESCE(SUM(CASE WHEN YEARWEEK(a.data_hora, 1) = YEARWEEK(CURDATE(), 1) AND a.status IN ('concluido', 'pago') THEN a.valor_total ELSE 0 END), 0) AS faturamento_semana,
                COALESCE(SUM(CASE WHEN MONTH(a.data_hora) = MONTH(CURDATE()) AND YEAR(a.data_hora) = YEAR(CURDATE()) AND a.status IN ('concluido', 'pago') THEN a.valor_total ELSE 0 END), 0) AS faturamento_mes,
                COALESCE(SUM(CASE WHEN YEAR(a.data_hora) = YEAR(CURDATE()) AND a.status IN ('concluido', 'pago') THEN a.valor_total ELSE 0 END), 0) AS faturamento_ano
            FROM usuarios u
            LEFT JOIN agendamentos a ON u.id = a.colaborador_id AND a.barbearia_id = u.barbearia_id
            WHERE u.barbearia_id = ? AND u.tipo = "colaborador"
            GROUP BY u.id, u.nome, u.email, u.telefone
            ORDER BY u.nome ASC
        `;
        
        const [colaboradoresData] = await db.query(query, [barbeariaId]);

        // Formatação de Moeda para o EJS ficar limpo
        const formatarMoeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const colaboradoresFormatados = colaboradoresData.map(c => ({
            ...c,
            faturamento_hoje_fmt: formatarMoeda(c.faturamento_hoje),
            faturamento_semana_fmt: formatarMoeda(c.faturamento_semana),
            faturamento_mes_fmt: formatarMoeda(c.faturamento_mes),
            faturamento_ano_fmt: formatarMoeda(c.faturamento_ano)
        }));

        res.render('admin/colaboradores', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'colaboradores',
            colaboradores: colaboradoresFormatados
        });
    } catch (error) {
        console.error("🔥 Erro ao carregar colaboradores:", error.message);
        res.status(500).send("Erro interno.");
    }
};

// Cadastra um novo colaborador
exports.cadastrarColaborador = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const { nome, email, telefone, password } = req.body;

    try {
        // Verifica se o e-mail já está em uso
        const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.send("<script>alert('Este e-mail já está sendo usado!'); window.history.back();</script>");
        }

        // Criptografa a senha do barbeiro
        const senhaHash = await bcrypt.hash(password, 10);

        // Insere na tabela de usuários vinculando à barbearia atual
        await db.query(
            'INSERT INTO usuarios (barbearia_id, nome, email, senha, telefone, tipo) VALUES (?, ?, ?, ?, ?, "colaborador")',
            [barbeariaId, nome, email, senhaHash, telefone]
        );

        res.redirect('/barbearia-app/admin/colaboradores');
    } catch (error) {
        console.error("Erro ao cadastrar colaborador:", error.message);
        res.status(500).send("Erro ao salvar no banco.");
    }
};

// Excluir Colaborador
exports.excluirColaborador = async (req, res) => {
    const { id } = req.params;
    const barbeariaId = req.session.barbeariaId;

    try {
        // A trava "AND barbearia_id = ?" garante que um dono não apague o barbeiro de outra barbearia
        await db.query('DELETE FROM usuarios WHERE id = ? AND barbearia_id = ? AND tipo = "colaborador"', [id, barbeariaId]);
        res.redirect('/barbearia-app/admin/colaboradores');
    } catch (error) {
        console.error("Erro ao excluir colaborador:", error.message);
        res.status(500).send("Erro ao excluir.");
    }
};

// Editar Colaborador
exports.editarColaborador = async (req, res) => {
    const { id } = req.params;
    const barbeariaId = req.session.barbeariaId;
    const { nome, telefone } = req.body; // Vamos permitir editar nome e telefone (email é melhor manter fixo para login)

    try {
        await db.query(
            'UPDATE usuarios SET nome = ?, telefone = ? WHERE id = ? AND barbearia_id = ? AND tipo = "colaborador"',
            [nome, telefone, id, barbeariaId]
        );
        res.redirect('/barbearia-app/admin/colaboradores');
    } catch (error) {
        console.error("Erro ao editar colaborador:", error.message);
        res.status(500).send("Erro ao editar.");
    }
};