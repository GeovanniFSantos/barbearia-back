const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Verifica se está rodando no servidor KingHost
const isKingHost = __dirname.includes('solucaosobmedida');

let uploadDir;

if (isKingHost) {
    // CAMINHO FÍSICO ABSOLUTO DO SERVIDOR KINGHOST
    // Obriga o Node a sair do apps_nodejs e jogar na pasta pública verdadeira do Nginx!
    uploadDir = '/home/solucaosobmedida/www/barbearia-app/public/uploads';
} else {
    // Caminho do seu PC local (Windows)
    // Ajuste aqui se a pasta do multer for diferente no seu PC
    uploadDir = path.join(__dirname, '../public/uploads'); 
}

// Garante que a pasta existe antes de tentar salvar
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.session.barbeariaId}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) return cb(null, true);
        cb("Erro: Apenas imagens são permitidas!");
    }
});

module.exports = upload;