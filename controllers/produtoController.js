const db = require('../db/db');


// Renderiza a lista de produtos
exports.listarProdutos = async (req, res) => {
    try {
        const barbeariaId = req.session.barbeariaId;
        
        // Busca os dados da barbearia para o Header/Sidebar
        const [barbearia] = await db.query('SELECT id, nome, slug, foto_perfil FROM barbearias WHERE id = ?', [barbeariaId]);
        
        // Busca os produtos
        const [produtos] = await db.query('SELECT * FROM produtos WHERE barbearia_id = ? ORDER BY nome ASC', [barbeariaId]);

        res.render('admin/produtos', {
            usuario: req.session.userNome,
            barbearia: barbearia[0],
            paginaAtiva: 'produtos',
            produtos: produtos
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error.message);
        res.status(500).send("Erro interno ao carregar a página.");
    }
};

// Cadastra um novo produto
exports.cadastrarProduto = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const { nome, descricao, preco, quantidade_estoque } = req.body;
    
    // Captura o link da imagem se o usuário fez upload
    let imagem_url = null;
    if (req.file) {
        imagem_url = '/uploads/' + req.file.filename; 
    }

    try {
        await db.query(
            'INSERT INTO produtos (barbearia_id, nome, descricao, preco, quantidade_estoque, imagem_url) VALUES (?, ?, ?, ?, ?, ?)',
            [barbeariaId, nome, descricao, preco, quantidade_estoque, imagem_url]
        );
        res.redirect('/admin/produtos');
    } catch (error) {
        console.error("Erro ao cadastrar produto:", error.message);
        res.status(500).send("Erro ao salvar produto no banco.");
    }
};

// Editar Produto
exports.editarProduto = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const produtoId = req.params.id;
    const { nome, descricao, preco, quantidade_estoque } = req.body;

    try {
        if (req.file) {
            const imagem_url = '/uploads/' + req.file.filename;
            await db.query(
                'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, quantidade_estoque = ?, imagem_url = ? WHERE id = ? AND barbearia_id = ?',
                [nome, descricao, preco, quantidade_estoque, imagem_url, produtoId, barbeariaId]
            );
        } else {
            await db.query(
                'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, quantidade_estoque = ? WHERE id = ? AND barbearia_id = ?',
                [nome, descricao, preco, quantidade_estoque, produtoId, barbeariaId]
            );
        }
        res.redirect('/admin/produtos');
    } catch (error) {
        console.error("Erro ao editar produto:", error.message);
        res.status(500).send("Erro ao editar o produto.");
    }
};

// Excluir Produto
exports.excluirProduto = async (req, res) => {
    const barbeariaId = req.session.barbeariaId;
    const produtoId = req.params.id;

    try {
        await db.query('DELETE FROM produtos WHERE id = ? AND barbearia_id = ?', [produtoId, barbeariaId]);
        res.redirect('/admin/produtos');
    } catch (error) {
        console.error("Erro ao excluir produto:", error.message);
        res.status(500).send("Erro ao excluir o produto.");
    }
};