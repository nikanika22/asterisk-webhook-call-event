require('dotenv').config();
const errors = [];
function getENV(key, require = true) {
    const val = process.env[key];
    if (require && !val) {
        errors.push(`Missing required environment variable: ${key}`);
    }
    return val;
}
module.exports = {
    DB: {
        host: getENV('DB_HOST'),
        port: parseInt(getENV('DB_PORT')),
        user: getENV('DB_USER'),
        password: getENV('DB_PASS', false),
        database: getENV('DB_NAME'),
    },
    AMI: {
        host: getENV('AMI_HOST'),
        port: parseInt(getENV('AMI_PORT')),
        user: getENV('AMI_USER'),
        password: getENV('AMI_PASS'),
    },
    SOCKET_PORT: parseInt(getENV('SOCKET_PORT')),
    CONNECTOR_SERVER: getENV('CONNECTOR_SERVER'),
};

if (errors.length > 0) {
    console.error("\n Lỗi cấu hình env: ");
    errors.forEach(error => console.log(error));
    process.exit(1);
}