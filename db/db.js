const mysql = require('mysql2/promise');

// Cria o Pool de conexões
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});

// Testa a conexão ao iniciar
db.getConnection()
    .then(conn => {
        console.log('✅ Conectado ao banco de dados: Solucão Sob Medida');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Erro na conexão:', err.message);
    });

module.exports = db;