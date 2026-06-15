const db = require('../db/db');

// Lista os horários de funcionamento
exports.renderHorarios = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);
        
        // Busca os horários já salvos no banco
        const [horarios] = await db.query('SELECT * FROM horarios_funcionamento WHERE barbearia_id = ? ORDER BY dia_semana ASC', [barbeariaId]);

        // Nomes dos dias para facilitar a exibição
        const diasNome = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

        res.render('admin/horario_funcionamento', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'horario_funcionamento',
            horarios: horarios,
            diasNome: diasNome
        });
    } catch (error) {
        console.error("Erro ao carregar horários:", error.message);
        res.status(500).send("Erro ao carregar horario_funcionamento.");
    }
};


// Salva ou atualiza os horários
exports.salvarHorarios = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const { dia, abertura, fechamento, almoco_inicio, almoco_fim, folga } = req.body;

    try {
        // Assegura que folga seja um array, mesmo se vier indefinido ou como string única
        const diasFolga = folga ? (Array.isArray(folga) ? folga : [folga]) : [];

        // Inicia a transação (se algo der erro no meio, ele cancela tudo e não quebra o banco)
        await db.query('START TRANSACTION');

        for (let i = 0; i < 7; i++) {
            // Verifica se o dia atual 'i' está marcado como folga
            const isFolga = diasFolga.includes(i.toString()) ? 1 : 0;
            
            // Trata valores vazios de tempo como nulos
            const horaAbertura = abertura[i] || null;
            const horaFechamento = fechamento[i] || null;
            const horaAlmocoInicio = almoco_inicio[i] || null;
            const horaAlmocoFim = almoco_fim[i] || null;

            const [existe] = await db.query('SELECT id FROM horarios_funcionamento WHERE barbearia_id = ? AND dia_semana = ?', [barbeariaId, i]);

            if (existe.length > 0) {
                await db.query(
                    `UPDATE horarios_funcionamento SET abertura = ?, fechamento = ?, almoco_inicio = ?, almoco_fim = ?, folga = ? 
                     WHERE barbearia_id = ? AND dia_semana = ?`,
                    [horaAbertura, horaFechamento, horaAlmocoInicio, horaAlmocoFim, isFolga, barbeariaId, i]
                );
            } else {
                await db.query(
                    `INSERT INTO horarios_funcionamento (barbearia_id, dia_semana, abertura, fechamento, almoco_inicio, almoco_fim, folga) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [barbeariaId, i, horaAbertura, horaFechamento, horaAlmocoInicio, horaAlmocoFim, isFolga]
                );
            }
        }
        
        // Confirma as alterações no banco
        await db.query('COMMIT');
        res.redirect('/barbearia-app/admin/horario_funcionamento');

    } catch (error) {
        // Se deu erro, desfaz tudo
        await db.query('ROLLBACK');
        console.error("Erro ao salvar horários:", error.message);
        res.status(500).send("Erro ao salvar horario de funcionamento.");
    }
};