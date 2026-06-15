const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const pagamentoController = require('../controllers/pagamentoController');

// Rota GET: /api/horarios-disponiveis
router.get('/horarios-disponiveis', apiController.buscarHorariosDisponiveis);
// Rota GET: /api/validar-cupom
router.get('/validar-cupom', apiController.validarCupom);
// Rota POST: /api/criar-preferencia
router.post('/criar-preferencia', pagamentoController.criarPreferencia);
// Rota POST: /api/processar-pagamento
router.post('/processar-pagamento', pagamentoController.processarPagamento);
// Rota POST: /api/webhook/mercadopago
router.post('/webhook/mercadopago', pagamentoController.receberWebhook);
// Rota POST: /api/cancelar-agendamento
router.post('/cancelar-agendamento', pagamentoController.cancelarEReembolsar);


module.exports = router;