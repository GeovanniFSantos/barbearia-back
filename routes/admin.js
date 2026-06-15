const express = require('express');
const router = express.Router();
const upload = require('../Middlewares/uploadMiddleware');
const authMiddleware = require('../Middlewares/authMiddleware');
const apiController = require('../controllers/apiController');
const adminController = require('../controllers/adminController');
const servicosController = require('../controllers/servicosController');
const produtoController = require('../controllers/produtoController');
const colaboradoresController = require('../controllers/colaboradoresController');
const agendaController = require('../controllers/agendaController');
const clientesAdminController = require('../controllers/clientesAdminController');
const horarioController = require('../controllers/horarioController');
const barbeariaController = require('../controllers/barbeariaController');
const formasPagamentoController = require('../controllers/formas_pagamentoController');
const cuponsController = require('../controllers/cuponsController');
const relatorioController = require('../controllers/relatorioController');
const notificacaoController = require('../controllers/notificacaoController');

// Dashboard Principal - Trava: Logado e ser Dono/Colaborador
router.get('/dashboard', authMiddleware.verificarLogin, authMiddleware.verificarDono, adminController.renderDashboard);

// Rotas para Gerenciamento de Serviços - Trava: Logado e ser Dono
router.get('/servicos', authMiddleware.verificarLogin, authMiddleware.verificarDono, servicosController.listarServicos);
// Rota para cadastrar um novo serviço - Trava: Logado e ser Dono
router.post('/servicos/cadastrar', authMiddleware.verificarLogin, authMiddleware.verificarDono, servicosController.cadastrarServico);
// Rota para editar um serviço - Trava: Logado e ser Dono
router.post('/servicos/editar/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, servicosController.editarServico);
// Rota para excluir um serviço - Trava: Logado e ser Dono
router.get('/servicos/excluir/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, servicosController.excluirServico);

// Rotas de Produtos
router.get('/produtos', authMiddleware.verificarLogin, authMiddleware.verificarDono, produtoController.listarProdutos);
// Se tiver o middleware de upload configurado, adicione-o aqui, ex: upload.single('imagem')
router.post('/produtos/cadastrar', authMiddleware.verificarLogin, authMiddleware.verificarDono, 
    upload.single('imagem'), produtoController.cadastrarProduto);
// Rota para editar um Produto - Trava: Logado e ser dono
router.post('/produtos/editar/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, 
    upload.single('imagem'), produtoController.editarProduto);
// Rota para excluir um produto - Trava: Logado e ser dono
router.get('/produtos/excluir/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, produtoController.excluirProduto);

// Rotas para Gerenciamento de Colaboradores - Trava: Logado e ser Dono
router.get('/colaboradores', authMiddleware.verificarLogin, authMiddleware.verificarDono, colaboradoresController.listarColaboradores);
// Rota para cadastrar um novo colaborador - Trava: Logado e ser Dono
router.post('/colaboradores/cadastrar', authMiddleware.verificarLogin, authMiddleware.verificarDono, colaboradoresController.cadastrarColaborador);
// Rota para excluir um colaborador - Trava: Logado e ser Dono
router.get('/colaboradores/excluir/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, colaboradoresController.excluirColaborador);
// Rota para editar um colaborador - Trava: Logado e ser Dono
router.post('/colaboradores/editar/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, colaboradoresController.editarColaborador);

// Rota para listar a agenda - Trava: Logado e ser Dono/Colaborador
router.get('/agenda', authMiddleware.verificarLogin, authMiddleware.verificarDono, agendaController.listarAgenda);
// Rota para criar um novo agendamento - Trava: Logado e ser Dono/Colaborador
router.post('/agenda/cadastrar', authMiddleware.verificarLogin, authMiddleware.verificarDono, agendaController.criarAgendamento);
// Rota para atualizar o status do agendamento - Trava: Logado e ser Dono/Colaborador
router.get('/agenda/status/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, agendaController.atualizarStatus);

// Rota para listar os clientes - Trava: Logado e ser Dono/Colaborador
router.get('/clientes', authMiddleware.verificarLogin, authMiddleware.verificarDono, clientesAdminController.listarClientes);

// Rotas para Configurações de Horários - Trava: Logado e ser Dono
router.get('/horario_funcionamento', authMiddleware.verificarLogin, authMiddleware.verificarDono, horarioController.renderHorarios);
// Rota para salvar os horários - Trava: Logado e ser Dono
router.post('/horario_funcionamento/salvar', authMiddleware.verificarLogin, authMiddleware.verificarDono, horarioController.salvarHorarios);
// Rota para validar cupom - Trava: Logado e ser Dono/Colaborador
router.get('/validar-cupom', apiController.validarCupom);

// Rotas para Configurações da Barbearia - Trava: Logado e ser Dono
router.get('/barbearia', authMiddleware.verificarLogin, authMiddleware.verificarDono, barbeariaController.renderConfigBarbearia);
// Rota para salvar as configurações da barbearia - Trava: Logado e ser Dono
router.post('/barbearia/salvar', authMiddleware.verificarLogin, authMiddleware.verificarDono, 
    upload.fields([{ name: 'foto_perfil', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), barbeariaController.atualizarBarbearia);

// Rotas para Configurações de Formas de Pagamento - Trava: Logado e ser Dono
router.get('/pagamentos', authMiddleware.verificarLogin, authMiddleware.verificarDono, formasPagamentoController.renderPagamentos);
// Rota para salvar as formas de pagamento - Trava: Logado e ser Dono
router.post('/pagamentos/salvar', authMiddleware.verificarLogin, authMiddleware.verificarDono, formasPagamentoController.salvarPagamentos);

// Rotas para Configurações de Cupons - Trava: Logado e ser Dono
router.get('/cupons', authMiddleware.verificarLogin, authMiddleware.verificarDono, cuponsController.listarCupons);
// Rota para criar um novo cupom - Trava: Logado e ser Dono
router.post('/cupons/salvar', authMiddleware.verificarLogin, authMiddleware.verificarDono, cuponsController.criarCupom);
// Rota para excluir um cupom - Trava: Logado e ser Dono
router.get('/cupons/excluir/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, cuponsController.excluirCupom);
// Rota para alternar o status do cupom - Trava: Logado e ser Dono
router.get('/cupons/status/:id', authMiddleware.verificarLogin, authMiddleware.verificarDono, cuponsController.alternarStatus);

// Rota para Relatórios - Trava: Logado e ser Dono
router.get('/relatorios',  authMiddleware.verificarLogin, authMiddleware.verificarDono, relatorioController.renderRelatorios);

// Rota da API interna para o sininho
router.get('/notificacoes/api', authMiddleware.verificarLogin, notificacaoController.getNotificacoes);

module.exports = router;