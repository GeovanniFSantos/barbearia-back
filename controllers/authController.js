const db = require('../db/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); 

// Busca sempre a barbearia 1 para o logotipo/nome na tela de login
async function buscarBarbeariaFixa() {
    try {
        const [b] = await db.query('SELECT nome, foto_perfil, slug FROM barbearias WHERE id = 1');
        return b.length > 0 ? b[0] : null;
    } catch (error) {
        console.error("Erro ao buscar barbearia:", error);
        return null;
    }
}

// Renderiza Login
exports.renderLogin = async (req, res) => {
    const barbearia = await buscarBarbeariaFixa();
    res.render('auth/login', { erro: null, sucesso: null, redirect: '/', barbearia });
};

// Realiza o Login
exports.realizarLogin = async (req, res) => {
    const { email, password } = req.body; 

    try {
        const barbearia = await buscarBarbeariaFixa();
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) return res.render('auth/login', { erro: 'E-mail ou senha incorretos!', sucesso: null, redirect: '/', barbearia });

        const usuario = rows[0];
        const senhaCorreta = await bcrypt.compare(password, usuario.senha);
        if (!senhaCorreta) return res.render('auth/login', { erro: 'E-mail ou senha incorretos!', sucesso: null, redirect: '/', barbearia });

        req.session.userId = usuario.id;
        req.session.userNome = usuario.nome;
        req.session.userRole = usuario.tipo;
        
        // Se for admin, garante que o ID na sessão é sempre 1
        if (usuario.tipo === 'dono' || usuario.tipo === 'colaborador') {
            req.session.barbeariaId = 1;
            return res.redirect('/admin/dashboard');
        }
        
        // Se for cliente
        return res.redirect('/'); 

    } catch (error) {
        console.error(error);
        res.status(500).send("Erro interno");
    }
};

// Renderiza Cadastro
exports.renderCadastro = async (req, res) => {
    const barbearia = await buscarBarbeariaFixa();
    res.render('auth/cadastro', { erro: null, redirect: '/', barbearia });
};

// Realiza Cadastro
exports.realizarCadastro = async (req, res) => {
    const { nome, email, password, telefone } = req.body;

    try {
        const barbearia = await buscarBarbeariaFixa();
        const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.render('auth/cadastro', { erro: 'Este e-mail já está em uso!', redirect: '/', barbearia });

        const senhaHash = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO usuarios (nome, email, senha, telefone, tipo) VALUES (?, ?, ?, ?, "cliente")',
            [nome, email, senhaHash, telefone]
        );

        res.redirect('/auth/login?sucesso=true');
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro no cadastro");
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
};

// Google Callback
exports.googleCallback = async (req, res) => {
    try {
        const profile = req.user; 
        const email = profile.emails[0].value;
        const nome = profile.displayName;

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        let usuarioId;
        let usuarioNome = nome;
        let usuarioTipo = 'cliente';

        if (usuarios.length > 0) {
            usuarioId = usuarios[0].id;
            usuarioNome = usuarios[0].nome;
            usuarioTipo = usuarios[0].tipo;
        } else {
            const [result] = await db.query(
                'INSERT INTO usuarios (nome, email, tipo) VALUES (?, ?, "cliente")', 
                [nome, email]
            );
            usuarioId = result.insertId;
        }

        req.session.userId = usuarioId;
        req.session.userNome = usuarioNome;
        req.session.userTipo = usuarioTipo;
        
        if (usuarioTipo === 'dono' || usuarioTipo === 'colaborador') {
            req.session.barbeariaId = 1;
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/');
        }

    } catch (error) {
        console.error("Erro no login com Google:", error);
        res.redirect('/auth/login?erro=google');
    }
};

// Recuperação de Senha
exports.renderEsqueceuSenha = async (req, res) => {
    const barbearia = await buscarBarbeariaFixa();
    res.render('auth/esqueceu-senha', { erro: null, sucesso: null, redirect: '/', barbearia });
};

exports.enviarEmailRecuperacao = async (req, res) => {
    const { email } = req.body;
    const barbearia = await buscarBarbeariaFixa();

    try {
        const [usuario] = await db.query('SELECT id, nome, senha FROM usuarios WHERE email = ?', [email]);
        
        if (usuario.length === 0) {
            return res.render('auth/esqueceu-senha', { erro: 'Não encontramos nenhuma conta com este e-mail.', sucesso: null, redirect: '/', barbearia });
        }

        if (!usuario[0].senha) {
            return res.render('auth/esqueceu-senha', { erro: 'Sua conta foi criada pelo Google. Faça login clicando em "Entrar com o Google".', sucesso: null, redirect: '/', barbearia });
        }

        const token = crypto.randomBytes(20).toString('hex');

        await db.query(
            'UPDATE usuarios SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = ?',
            [token, email]
        );

        const baseUrl = req.protocol + '://' + req.get('host');
        const linkRecuperacao = `${baseUrl}/auth/redefinir-senha?token=${token}`;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const emailHTML = `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2563eb; margin: 0;">${barbearia.nome || 'Recuperação de Acesso'}</h2>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h3 style="color: #1f2937; margin-top: 0;">Olá, ${usuario[0].nome}!</h3>
                    <p style="color: #4b5563; line-height: 1.6;">Recebemos um pedido para redefinir a senha da sua conta.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${linkRecuperacao}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
                    </div>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: '"' + (barbearia.nome || 'Barbearia') + '" <' + process.env.EMAIL_USER + '>',
            to: email,
            subject: '🔒 Redefinição de Senha',
            html: emailHTML
        });

        res.render('auth/esqueceu-senha', { erro: null, sucesso: 'Enviamos um link de recuperação para o seu e-mail!', redirect: '/', barbearia });

    } catch (error) {
        console.error("Erro na recuperação:", error);
        res.render('auth/esqueceu-senha', { erro: 'Ocorreu um erro no servidor. Tente novamente.', sucesso: null, redirect: '/', barbearia });
    }
};

exports.renderRedefinirSenha = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.redirect('/auth/login');
    const barbearia = await buscarBarbeariaFixa();

    try {
        const [usuario] = await db.query('SELECT id FROM usuarios WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
        if (usuario.length === 0) {
            return res.render('auth/login', { erro: 'O link de recuperação é inválido ou já expirou.', sucesso: null, redirect: '/', barbearia });
        }
        res.render('auth/redefinir-senha', { token, erro: null, redirect: '/', barbearia });
    } catch (error) {
        console.error(error);
        res.redirect('/auth/login');
    }
};

exports.salvarNovaSenha = async (req, res) => {
    const { token, password } = req.body;
    const barbearia = await buscarBarbeariaFixa();

    try {
        const [usuario] = await db.query('SELECT id FROM usuarios WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
        if (usuario.length === 0) {
            return res.render('auth/redefinir-senha', { token, erro: 'O link expirou.', redirect: '/', barbearia });
        }

        const senhaHash = await bcrypt.hash(password, 10);
        await db.query('UPDATE usuarios SET senha = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [senhaHash, usuario[0].id]);
        
        res.redirect('/auth/login?sucesso=true');
    } catch (error) {
        console.error(error);
        res.render('auth/redefinir-senha', { token, erro: 'Erro ao atualizar a senha.', redirect: '/', barbearia });
    }
};