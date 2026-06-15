const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('../config/passport');
const authMiddleware = require('../middlewares/authMiddleware');


// Rota GET para mostrar o formulário de login (Ex: site.com/auth/login)
router.get('/login', authMiddleware.verificarDeslogado, authController.renderLogin);

// Rota POST para processar o formulário de login
router.post('/login', authMiddleware.verificarDeslogado,authController.realizarLogin);

// Rota GET para mostrar formulário de cadastro
router.get('/cadastro', authMiddleware.verificarDeslogado, authController.renderCadastro);

// Rota POST para processar o formulário de cadastro
router.post('/cadastro', authMiddleware.verificarDeslogado, authController.realizarCadastro);

// Rota para deslogar
router.get('/logout', authController.logout);

// Rota que redireciona o usuário para a tela do Google
router.get('/google', (req, res, next) => {
    // Guarda o slug da barbearia na sessão antes de ir pro Google
    if (req.query.redirect) { req.session.returnTo = req.query.redirect;} next();}, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Rota de retorno após o cliente aprovar no Google (O parâmetro session: false impede conflitos com o nosso express-session)
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/barbearia-app/auth/login', session: false }), authController.googleCallback);


router.get('/esqueceu-senha', authController.renderEsqueceuSenha);
router.post('/esqueceu-senha', authController.enviarEmailRecuperacao);

router.get('/redefinir-senha', authController.renderRedefinirSenha);
router.post('/redefinir-senha', authController.salvarNovaSenha);

module.exports = router;
