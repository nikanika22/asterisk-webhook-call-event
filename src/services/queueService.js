const { getAMI } = require('../config/asterisk');
const { getTimeFormat } = require('../utils/dateHelper');

const ami = getAMI();

async function find(items, text) {
    return Object.keys(items).filter((item) => items[item].indexOf(text) > -1);
}

async function addMember({ queue, extension, agentId, penalty = 0 }) {
    agentId = agentId || '00' + extension;

    return new Promise((resolve, reject) => {
        ami.action(
            { action: 'QueueAdd', queue, interface: `Local/${agentId}@agentqueue/n`, membername: agentId, stateinterface: `hint:${extension}@ext-local`, penalty },
            (err, rq) => {
                if (err) return reject(err);
                if (rq.response !== 'Success') return reject(rq);

                ami.action(
                    { action: 'queuelog', interface: `Local/${agentId}@agentqueue/n`, queue, event: 'AGENTLOGIN', message: extension },
                    (err2, rq2) => {
                        if (err2) return reject(err2);
                        if (rq2.response !== 'Success') return reject(rq2);

                        ami.action(
                            { action: 'command', command: `DATABASE PUT agentqueue ${agentId} SIP/${extension}` },
                            (err3, rq3) => {
                                if (err3) return reject(err3);
                                console.log(`*** ${getTimeFormat()} | Action: Login ${agentId} - Queue ${queue}`);
                                resolve(rq3);
                            }
                        );
                    }
                );
            }
        );
    });
}

async function removeMember({ queue, extension, agentId }) {
    agentId = agentId || '00' + extension;

    return new Promise((resolve, reject) => {
        ami.action(
            { action: 'QueueRemove', queue, interface: `Local/${agentId}@agentqueue/n` },
            async (err, rq) => {
                if (err) return reject(err);
                if (rq.response !== 'Success') return reject(rq);

                const command = { action: 'command', command: 'queue show' };
                ami.action(command, async (err2, res2) => {
                    const arr = res2.output;
                    const hint = `hint:${extension}@ext-local`;
                    const check = await find(arr, hint);
                    if (parseInt(check.length + 1) <= 1) {
                        ami.action(
                            { action: 'command', command: `DATABASE DEL agentqueue ${agentId}` },
                            (err3, rq3) => {
                                if (err3) return reject(err3);
                                console.log(`*** ${getTimeFormat()} | Action: Logout ${agentId} - Queue ${queue}`);
                                resolve(rq3);
                            }
                        );
                    } else {
                        console.log(`*** ${getTimeFormat()} | Action: Logout ${agentId} - Queue ${queue}`);
                        resolve(rq);
                    }
                });
            }
        );
    });
}

async function pauseMember({ queue, extension, agentId, paused = false, reason }) {
    agentId = agentId || '00' + extension;
    const pauseAction = {
        Action: 'QueuePause',
        Paused: paused,
        Queue: queue,
        interface: `Local/${agentId}@agentqueue/n`,
        membername: agentId,
        stateinterface: `hint:${extension}@ext-local`,
    };
    if (reason) pauseAction.Reason = reason;

    return new Promise((resolve, reject) => {
        ami.action(pauseAction, (err, rq) => {
            if (err) return reject(err);
            if (rq.response !== 'Success') return reject(rq);
            console.log(`*** ${getTimeFormat()} | Action: Pause ${agentId} - Queue ${queue} - Reason: ${reason}`);
            resolve(rq);
        });
    });
}

async function queueStatus(queues) {
    const rs = {};
    return new Promise((resolve) => {
        queues.forEach((queue) => {
            ami.action({ action: 'QueueStatus', queue }, (err, rq) => { rs[queue] = rq; });
        });
        setTimeout(() => resolve(rs), 1000);
    });
}

async function getExtensionInQueue(queue, dbRows) {
    const extTmp = [];
    dbRows.forEach((hlInfo) => {
        hlInfo = hlInfo.split('##');
        const exts = hlInfo[0].split(',');
        exts.forEach((e) => extTmp.push(e));
    });

    return new Promise((resolve, reject) => {
        ami.action({ action: 'Command', Command: `queue show ${queue}` }, (err, rq) => {
            if (err) return reject(err);
            const arr = [];
            const arrname = {};
            for (let i = 0; i < rq.output.length; i++) {
                const check = rq.output[i].match(/Local\/(.+)@from-queue/);
                const checkagentname = rq.output[i].match(/(.+)\(Local/);
                if (check != null && check.length > 1 && extTmp.indexOf(check[1]) > -1) {
                    arr.push(check[1].toString());
                    if (checkagentname != null && checkagentname.length > 1) {
                        arrname[check[1].toString()] = checkagentname[1].trim();
                    }
                }
            }
            resolve({ arr, arrname });
        });
    });
}

module.exports = { addMember, removeMember, pauseMember, queueStatus, getExtensionInQueue };
