module.exports = {
    // 1. Verifica se o usuário está logado (Trava geral)
    verificarLogin: (req, res, next) => {
        if (req.session && req.session.userId) {
            return next(); // Está logado, pode passar!
        }
        // Se não estiver logado, manda de volta pro login
        res.redirect('/barbearia-app/auth/login');
    },

    // 2. Trava do SuperAdmin (Só você entra)
    verificarSuperAdmin: (req, res, next) => {
        if (req.session && req.session.userRole === 'superadmin') {
            return next();
        }
        // Se tentar bancar o espertinho acessando /superadmin
        res.status(403).send(`
            <h1>Acesso Negado 🚫</h1>
            <p>Você não tem permissão de CEO para acessar esta área.</p>
            <a href="/">Voltar ao início</a>
        `);
    },

    // 3. Trava do Dono da Barbearia / Colaborador
    verificarDono: (req, res, next) => {
        if (req.session && (req.session.userRole === 'dono' || req.session.userRole === 'colaborador')) {
            return next();
        }
        res.status(403).send(`
            <h1>Acesso Negado ✂️</h1>
            <p>Área restrita à gestão da barbearia.</p>
            <a href="/auth/login">Voltar ao início</a>
        `);
    },

    // 4. Verifica se o usuário já está logado (para telas de login/cadastro)
    verificarDeslogado: (req, res, next) => {
        // Se o usuário JÁ ESTIVER logado, manda ele de volta pro painel dele
        if (req.session && req.session.userId) {
            if (req.session.userRole === 'superadmin') return res.redirect('/superadmin');
            if (req.session.userRole === 'dono') return res.redirect('/admin/dashboard');
            return res.redirect('/');
        }
        // Se não estiver logado, deixa ele ver a tela de login/cadastro em paz
        next();
    }

};