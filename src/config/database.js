const mysql = require('mysql');
const { db } = require('../env');

const pool = mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    connectionLimit: 10,
    connectTimeout: 10000,
});

pool.on('error', (err) => {
    console.error('[DB] Pool error:', err.message);
});

module.exports = pool;
