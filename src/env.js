require('dotenv').config();
module.exports = {
    DB: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'db_contactpopup',
    },
    AMI: {
        host: process.env.AMI_HOST || '127.0.0.1',
        port: parseInt(process.env.AMI_PORT) || 5038,
        user: process.env.AMI_USER || 'admin',
        password: process.env.AMI_PASS || 'admin',
    },
    SOCKET_PORT: parseInt(process.env.SOCKET_PORT) || 3000,
    CONNECTOR_SERVER: process.env.CONNECTOR_SERVER || 'voice_server_49',
};
