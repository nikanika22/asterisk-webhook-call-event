const AsteriskManager = require('asterisk-manager');
const { ami: amiConfig } = require('../env');

let amiInstance = null;

function getAMI() {
    if (amiInstance) return amiInstance;

    amiInstance = new AsteriskManager(
        amiConfig.port,
        amiConfig.host,
        amiConfig.user,
        amiConfig.password,
        true   // true = nhận tất cả events từ AMI
    );

    amiInstance.keepConnected();

    amiInstance.on('error', (err) => {
        console.error('[AMI] Connection error:', err.message);
    });

    amiInstance.on('close', () => {
        console.warn('[AMI] Connection closed — will reconnect...');
    });

    return amiInstance;
}

module.exports = { getAMI };
