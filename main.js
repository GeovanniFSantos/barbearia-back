const session = require('express-session');
const express = require('express');
require('dotenv').config();
const app = express();
const path = require('path');

// --- Importação das Rotas ---
const authRoutes = require('./routes/auth');
const superAdminRoutes = require('./routes/superadmin');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const clienteRoutes = require('./routes/cliente');


const PORT = process.env.PORT || 3000;

// --- Middlewares ---
// Para ler dados de formulários (POST)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de Sessão para manter o usuário logado
app.use(session({
    secret: 'chave_super_secreta_barbearia_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Middleware para evitar cache e garantir que as páginas sejam sempre atualizadas
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});


// --- Configurações de View Engine (EJS) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../www/barbearia-app/views')); 

// -- Prefixar o static path
app.use('/barbearia-app', express.static(
    path.join(__dirname, '../../www/barbearia-app/public')));


app.get('/barbearia-app/termos', (req, res) => res.render('institucional/termos'));
app.get('/barbearia-app/privacidade', (req, res) => res.render('institucional/privacidade'));



// --- Definição das Rotas Principais ---
// Tudo que for de login/cadastro passa por aqui
app.use('/barbearia-app/auth', authRoutes);

// Rotas do SuperAdmin
app.use('/barbearia-app/superadmin', superAdminRoutes);

// Rotas do Dono da Barbearia
app.use('/barbearia-app/admin', adminRoutes);

// Rotas da API para o cliente final (Busca de horários disponíveis)
app.use('/barbearia-app/api', apiRoutes);

// Rota pra inicializar a tela de landing-Page
app.get('/barbearia-app/', (req, res) => res.render('institucional/landing'));

// Rotas do Cliente final (Agendamento)
app.use('/barbearia', clienteRoutes); 

// Erros
app.use((err, req, res, next) => {
    console.error("❌ ERRO NO SERVIDOR:", err.stack);
    res.status(500).send("Algo deu errado no servidor da Barbearia!");
});

// --- Iniciando o Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: https://solucaosobmedida.com.br/barbearia-app/:${PORT}`);
});