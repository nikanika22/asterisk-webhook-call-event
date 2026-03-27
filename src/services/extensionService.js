const { getAMI } = require('../config/asterisk');

const ami = getAMI();

const arrExtensionStatus = { '-1': 'extension_not_found', '0': 'idle', '1': 'in_Use', '2': 'busy', '4': 'unavailable', '8': 'ringing', '16': 'on_hold' };

async function getExtensionStatus(extension) {
    return new Promise((resolve, reject) => {
        if (!extension) return reject({ code: 406, message: 'params không hợp lệ' });
        ami.action({ action: 'ExtensionState', exten: extension, context: 'ext-local' }, (err, response) => {
            if (err || response.response === 'Error') return reject({ code: 400, message: 'extension error' });
            resolve({
                extension,
                status: arrExtensionStatus[response.status],
                code: 200,
                statusNumber: response.status,
            });
        });
    });
}

function actionGetDevicePeer(peer, valGet, callback) {
    ami.action({ action: 'command', command: `sip show peer ${peer}` }, (err, res) => callback(res));
}

module.exports = { getExtensionStatus, actionGetDevicePeer };
