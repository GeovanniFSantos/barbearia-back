const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

// Importando os middlewares
const authMiddleware = require('../Middlewares/authMiddleware');

// Rota GET para ver o painel
router.get('/', authMiddleware.verificarLogin, authMiddleware.verificarSuperAdmin, superAdminController.renderDashboard);

// Rota POST para receber os dados do formulário do modal
router.post('/cadastrar', authMiddleware.verificarLogin, authMiddleware.verificarSuperAdmin, superAdminController.cadastrarBarbearia);

// Rota para alternar o status da barbearia
router.get('/status/:id/:statusAtual', authMiddleware.verificarLogin, authMiddleware.verificarSuperAdmin, superAdminController.alternarStatus);

module.exports = router;