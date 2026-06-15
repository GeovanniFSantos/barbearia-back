const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que a pasta public/uploads existe antes de tentar salvar
const uploadDir = path.join(__dirname, '../../www/barbearia-app/public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Usa o caminho seguro que acabamos de validar
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