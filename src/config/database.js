const mysql = require('mysql');
const { DB } = require('../env');

const pool = mysql.createPool({
    host: DB.host,
    port: DB.port,
    user: DB.user,
    password: DB.password,
    database: DB.database,
    connectionLimit: 10,
    connectTimeout: 10000,
});

pool.on('error', (err) => {
    console.error('[DB] Pool error:', err.message);
});

module.exports = pool;
