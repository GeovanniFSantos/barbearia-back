const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const authMiddleware = require('../middlewares/authMiddleware');

// 1. Rota de Meus Agendamentos (VEM ANTES DO SLUG!)
router.get('/meus-agendamentos', authMiddleware.verificarLogin, clienteController.listarMeusAgendamentos);

// 2. Rota para salvar o agendamento
router.post('/agendar', authMiddleware.verificarLogin, clienteController.realizarAgendamento);

// 3. Rota para exibir o perfil do cliente
router.get('/meu-perfil', authMiddleware.verificarLogin, clienteController.renderPerfil);

// 4. Rota para salvar as alterações do perfil
router.post('/meu-perfil/salvar', authMiddleware.verificarLogin, clienteController.atualizarPerfil);

// 5. Rota da vitrine (SEMPRE POR ÚLTIMO)
router.get('/', clienteController.renderHomeBarbearia);


module.exports = router;