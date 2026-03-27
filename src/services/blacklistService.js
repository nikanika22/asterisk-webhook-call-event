const { getAMI } = require('../config/asterisk');

const ami = getAMI();

function addBlacklist(req) {
    const data = req.data;
    if (typeof data === 'undefined') return { code: 400, message: 'data is required' };
    for (let i = 0; i < data.length; i++) {
        const caller = data[i].caller, msg = data[i].reason;
        ami.action({ action: 'command', command: `database put blacklist ${caller} "${msg}"` }, (err, rq) => {
            if (err || rq.response === 'Error') console.log('Error add', caller, 'into Blacklist');
            else console.log('Success add', caller, 'into Blacklist');
        });
    }
    return { code: 200, message: 'add black list success' };
}

function removeBlacklist(req) {
    const data = req.data;
    if (typeof data === 'undefined') return { code: 400, message: 'data is required' };
    for (let i = 0; i < data.length; i++) {
        const caller = data[i].caller;
        ami.action({ action: 'command', command: `database del blacklist ${caller}` }, (err, rq) => {
            if (err || rq.response === 'Error') console.log('Error remove', caller, 'from Blacklist');
            else console.log('Success remove', caller, 'from Blacklist');
        });
    }
    return { code: 200, message: 'remove black list success' };
}

module.exports = { addBlacklist, removeBlacklist };
