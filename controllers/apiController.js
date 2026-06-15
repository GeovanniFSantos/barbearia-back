const db = require('../db/db');

// API para buscar horários disponíveis de um colaborador em um dia específico
exports.buscarHorariosDisponiveis = async (req, res) => {
    try {
        //console.log("=== INICIANDO BUSCA DE HORÁRIOS ===");
        //console.log("🔍 1. Parâmetros recebidos do front-end:", req.query);

        const { barbearia_id, colaborador_id, servico_id, data } = req.query;

        // 1. Cálculo de Dia BLINDADO contra Fuso Horário
        const [ano, mes, diaString] = data.split('-');
        const dataObj = new Date(ano, mes - 1, diaString);
        const diaSemana = dataObj.getDay();
        
        console.log(`📅 2. Data escolhida: ${data} | Dia da semana calculado: ${diaSemana}`);

        // 2. Busca o horário de funcionamento
        const [horariosFunc] = await db.query(
            'SELECT * FROM horarios_funcionamento WHERE barbearia_id = ? AND dia_semana = ?', 
            [barbearia_id, diaSemana]
        );

        console.log("📦 3. O que o banco de dados devolveu:", horariosFunc);

        // Se não achou nada no banco
        if (horariosFunc.length === 0) {
            console.log("❌ ERRO: Tabela de horários vazia para este dia/barbearia!");
            return res.json({ disponiveis: [], mensagem: "Fechado neste dia." });
        }

        const h = horariosFunc[0];

        // Blindagem Tripla para ler o TINYINT do MySQL (Trata Número, Booleano e Buffer)
        let isFolga = false;
        if (h.folga === 1 || h.folga === true) isFolga = true;
        if (Buffer.isBuffer(h.folga) && h.folga[0] === 1) isFolga = true;

        if (isFolga) {
            console.log("🏖️ AVISO: O banco confirmou que é dia de folga.");
            return res.json({ disponiveis: [], mensagem: "Fechado neste dia." });
        }

        //console.log("✅ Dia aberto! Calculando slots...");

        // 3. Busca a duração do serviço
        const [servicos] = await db.query('SELECT duracao_minutos FROM servicos WHERE id = ?', [servico_id]);
        if (servicos.length === 0) return res.status(400).json({ erro: "Serviço não encontrado." });
        
        const duracaoServico = servicos[0].duracao_minutos;

        // 4. Busca os agendamentos já marcados para este colaborador
        const queryAgendamentos = `
            SELECT DATE_FORMAT(data_hora, '%H:%i') as hora_marcada, s.duracao_minutos 
            FROM agendamentos a
            JOIN servicos s ON a.servico_id = s.id
            WHERE a.colaborador_id = ? AND DATE(a.data_hora) = ? AND a.status != 'cancelado'
        `;
        const [agendamentosMarcados] = await db.query(queryAgendamentos, [colaborador_id, data]);

        // ==========================================
        // MOTOR DE CÁLCULO
        // ==========================================
        const horariosLivres = [];
        
        const timeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const [horas, minutos] = timeStr.split(':');
            return parseInt(horas) * 60 + parseInt(minutos);
        };

        const minutesToTime = (mins) => {
            const horas = Math.floor(mins / 60).toString().padStart(2, '0');
            const minutos = (mins % 60).toString().padStart(2, '0');
            return `${horas}:${minutos}`;
        };

        let tempoAtual = timeToMinutes(h.abertura);
        const fimExpediente = timeToMinutes(h.fechamento);
        
        // Trata o almoço opcional
        const temAlmoco = h.almoco_inicio && h.almoco_fim;
        const inicioAlmoco = temAlmoco ? timeToMinutes(h.almoco_inicio) : 0;
        const fimAlmoco = temAlmoco ? timeToMinutes(h.almoco_fim) : 0;

        // BLOQUEIO DE HORÁRIO PASSADO
        const hoje = new Date();
        let horaAtualEmMinutos = 0;
        if (hoje.toDateString() === dataObj.toDateString()) {
            horaAtualEmMinutos = (hoje.getHours() * 60) + hoje.getMinutes();
        }

        while (tempoAtual + duracaoServico <= fimExpediente) {
            const horaAtualStr = minutesToTime(tempoAtual);
            let slotValido = true;

            // Regra 1: O horário já passou?
            if (tempoAtual <= horaAtualEmMinutos) slotValido = false;

            // Regra 2: Bate com horário de almoço? (Só valida se tiver almoço)
            if (slotValido && temAlmoco) {
                if ((tempoAtual >= inicioAlmoco && tempoAtual < fimAlmoco) || 
                    (tempoAtual + duracaoServico > inicioAlmoco && tempoAtual < fimAlmoco)) {
                    slotValido = false;
                }
            }

            // Regra 3: Bate com algum agendamento já existente?
            if (slotValido) {
                for (let ag of agendamentosMarcados) {
                    const inicioAgendado = timeToMinutes(ag.hora_marcada);
                    const fimAgendado = inicioAgendado + ag.duracao_minutos;

                    if ((tempoAtual >= inicioAgendado && tempoAtual < fimAgendado) ||
                        (tempoAtual + duracaoServico > inicioAgendado && tempoAtual < fimAgendado)) {
                        slotValido = false;
                        break;
                    }
                }
            }

            if (slotValido) horariosLivres.push(horaAtualStr);

            tempoAtual += 30; // Pula de 30 em 30 min
        }

        res.json({ disponiveis: horariosLivres });

    } catch (error) {
        res.status(500).json({ erro: "Erro interno da API." });
    }
};

// API para validar cupom de desconto (usada no front-end da agenda)
exports.validarCupom = async (req, res) => {
    const { codigo, barbearia_id } = req.query;

    try {
        const [cupons] = await db.query(
            'SELECT * FROM cupons WHERE codigo = ? AND barbearia_id = ? AND ativo = 1',
            [codigo, barbearia_id]
        );

        if (cupons.length === 0) {
            return res.status(400).json({ erro: "Cupom inválido ou inativo." });
        }

        const cupom = cupons[0];

        // Verifica validade (se existir)
        if (cupom.data_validade) {
            const hoje = new Date();
            const validade = new Date(cupom.data_validade);
            // Ajusta para o final do dia da validade
            validade.setHours(23, 59, 59, 999); 
            
            if (hoje > validade) {
                return res.status(400).json({ erro: "Este cupom já expirou." });
            }
        }

        // Se passou, devolve o cupom
        res.json(cupom);
    } catch (error) {
        console.error("Erro ao validar cupom:", error);
        res.status(500).json({ erro: "Erro interno ao validar cupom." });
    }
};

