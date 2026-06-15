const db = require('../db/db');
const bcrypt = require('bcrypt');

// Renderiza a página de configurações da barbearia e Perfil
exports.renderConfigBarbearia = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const userId = req.session.userId; // ID do dono logado

    try {
        // Busca dados da barbearia
        const [barbearias] = await db.query('SELECT id, nome, slug, foto_perfil, banner FROM barbearias WHERE id = ?', [barbeariaId]);
        
        // Busca o endereço, se existir
        const [enderecos] = await db.query('SELECT * FROM enderecos_barbearia WHERE barbearia_id = ?', [barbeariaId]);
        const endereco = enderecos.length > 0 ? enderecos[0] : {};

        // Busca os dados do Dono (Perfil)
        const [dono] = await db.query('SELECT nome, email FROM usuarios WHERE id = ?', [userId]);

        res.render('admin/barbearia', {
            barbearia: barbearias[0],
            endereco: endereco,
            dono: dono[0], // <-- Nova variável enviada para o EJS
            usuario: req.session.userNome,
            paginaAtiva: 'barbearia'
        });
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        res.status(500).send("Erro ao carregar configurações.");
    }
};

exports.atualizarBarbearia = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const userId = req.session.userId;
    
    // Dados da Aba Empresa
    const { nome, descricao } = req.body;
    
    // Dados da Aba Endereço
    const { cep, rua, numero, bairro, cidade, uf, complemento } = req.body;

    // Dados da Aba Perfil
    const { dono_nome, senha_nova } = req.body;

    try {
        await db.query('START TRANSACTION');

        // 1. Atualiza a Barbearia (Fotos e Textos)
        let foto_perfil = req.files && req.files['foto_perfil'] ? `/uploads/${req.files['foto_perfil'][0].filename}` : null;
        let banner = req.files && req.files['banner'] ? `/uploads/${req.files['banner'][0].filename}` : null;

        let queryBarbearia = "UPDATE barbearias SET nome = ?, descricao = ?";
        let paramsBarbearia = [nome, descricao];

        if (foto_perfil) { queryBarbearia += ", foto_perfil = ?"; paramsBarbearia.push(foto_perfil); }
        if (banner) { queryBarbearia += ", banner = ?"; paramsBarbearia.push(banner); }

        queryBarbearia += " WHERE id = ?";
        paramsBarbearia.push(barbeariaId);

        await db.query(queryBarbearia, paramsBarbearia);

        // 2. Atualiza ou Insere o Endereço
        const [existeEndereco] = await db.query('SELECT id FROM enderecos_barbearia WHERE barbearia_id = ?', [barbeariaId]);
        
        if (existeEndereco.length > 0) {
            await db.query(
                'UPDATE enderecos_barbearia SET cep=?, rua=?, numero=?, bairro=?, cidade=?, uf=?, complemento=? WHERE barbearia_id=?',
                [cep, rua, numero, bairro, cidade, uf, complemento, barbeariaId]
            );
        } else {
            await db.query(
                'INSERT INTO enderecos_barbearia (barbearia_id, cep, rua, numero, bairro, cidade, uf, complemento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [barbeariaId, cep, rua, numero, bairro, cidade, uf, complemento]
            );
        }

        // 3. Atualiza o Perfil do Dono (Nome e Senha se fornecida)
        let queryUsuario = 'UPDATE usuarios SET nome = ? WHERE id = ?';
        let paramsUsuario = [dono_nome, userId];

        if (senha_nova && senha_nova.trim() !== '') {
            const senhaHash = await bcrypt.hash(senha_nova, 10);
            queryUsuario = 'UPDATE usuarios SET nome = ?, senha = ? WHERE id = ?';
            paramsUsuario = [dono_nome, senhaHash, userId];
        }

        await db.query(queryUsuario, paramsUsuario);
        
        // Atualiza a sessão para o nome no topo da tela mudar na hora
        req.session.userNome = dono_nome;

        await db.query('COMMIT');
        res.redirect('/barbearia-app/admin/barbearia?sucesso=true');

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Erro ao atualizar:", error);
        res.status(500).send("Erro interno ao atualizar configurações.");
    }
};