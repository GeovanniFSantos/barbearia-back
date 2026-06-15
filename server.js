require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configurações de View Engine (EJS) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middlewares ---
// Para ler dados de formulários (POST)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Pasta pública para o TailwindCSS, imagens e JS do front-end
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Configuração de Sessão para manter o usuário logado
app.use(session({
    secret: 'chave_super_secreta_barbearia_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.get('/termos', (req, res) => res.render('institucional/termos'));
app.get('/privacidade', (req, res) => res.render('institucional/privacidade'));

// --- Importação das Rotas ---
const authRoutes = require('./routes/auth');
const superAdminRoutes = require('./routes/superadmin');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const clienteRoutes = require('./routes/cliente');

// --- Definição das Rotas Principais ---
// Tudo que for de login/cadastro passa por aqui
app.use('/auth', authRoutes);

// Rotas do SuperAdmin
app.use('/superadmin', superAdminRoutes);

// Rotas do Dono da Barbearia
app.use('/admin', adminRoutes);

// Rotas da API para o cliente final (Busca de horários disponíveis)
app.use('/api', apiRoutes);

// Rotas do Cliente final (Agendamento)
app.use('/', clienteRoutes); 

// --- Iniciando o Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: https://solucaosobmedida.com.br/barbearia/:${PORT}/`);
});