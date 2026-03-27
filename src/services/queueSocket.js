const queueService = require('./queueService');
const state = require('../utils/store');
const { encodeDataToClient } = require('../utils/encoder');
const { getTimeFormat } = require('../utils/dateHelper');
const { getAMI } = require('../config/asterisk');

const ami = getAMI();

async function find(items, text) {
    return Object.keys(items).filter((item) => items[item].indexOf(text) > -1);
}

function loginQueue(socket, data) {
    const penalty = data.penalty || 0;
    ami.action(
        { action: 'queueadd', queue: data.queue, interface: `Local/${data.agentId}@agentqueue/n`, membername: data.agentId, stateinterface: `hint:${data.extension}@ext-local`, penalty },
        (err, rq) => {
            if (err) { socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err.message })); return; }
            ami.action(
                { action: 'queuelog', interface: `Local/${data.agentId}@agentqueue/n`, queue: data.queue, event: 'AGENTLOGIN', message: data.extension },
                (err2) => {
                    if (err2) { socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err2.message })); return; }
                    ami.action(
                        { action: 'command', command: `DATABASE PUT agentqueue ${data.agentId} SIP/${data.extension}` },
                        (err3, rq3) => {
                            if (err3) { socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err3.message })); return; }
                            console.log(`*** ${getTimeFormat()} | Action: Login ${data.agentId} - Queue ${data.queue}`);
                            socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'success', message: rq3.message }));
                        }
                    );
                }
            );
        }
    );
}

function logoutQueue(socket, data) {
    ami.action(
        { action: 'QueueRemove', queue: data.queue, interface: `Local/${data.agentId}@agentqueue/n` },
        (err, rq) => {
            if (err) { socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err.message })); return; }
            console.log(`*** ${getTimeFormat()} | Action: Logout ${data.agentId} - Queue ${data.queue}`);
            socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'success', message: rq.message }));
        }
    );
}

function pauseQueue(socket, data) {
    if (!data.paused) data.paused = false;
    const pauseAction = {
        action: 'queuepause', paused: data.paused, queue: data.queue,
        interface: `Local/${data.agentId}@agentqueue/n`, membername: data.agentId,
        stateinterface: `hint:${data.extension}@ext-local`, reason: data.reason || 'ACW',
    };
    ami.action(pauseAction, (err, rq) => {
        if (err) { socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err.message })); return; }
        console.log(`*** ${getTimeFormat()} | Action: Pause ${data.agentId} - Queue ${data.queue} - Reason: ${data.reason}`);
        socket.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'success', message: rq.message }));
    });
}

function loginQueuev2(socket, data) {
    const userInfo = state.listUserConnected[socket.id];
    if (!userInfo || !userInfo.channel) { console.log(socket.id, 'login queue failed!!!'); return; }
    ami.action(
        { action: 'queueadd', interface: userInfo.channel, queue: data.queue, membername: userInfo.agentName, stateinterface: `hint:${userInfo.extension}@ext-local` },
        (errA, resA) => {
            if (resA.response === 'Success') {
                ami.action(
                    { action: 'queuelog', interface: userInfo.channel, queue: data.queue, event: 'AGENTLOGIN', message: userInfo.extension },
                    (errB, resB) => { if (resB.response === 'Success') console.log('Success LoginQueue', resB); }
                );
            }
        }
    );
}

function loginQueuev3(socket, data) {
    const channel = `Local/${data.extension}@from-queue/n`;
    ami.action(
        { action: 'queueadd', interface: channel, queue: data.queue, membername: data.extension, stateinterface: `hint:${data.extension}@ext-local` },
        (errA, resA) => {
            if (resA.response === 'Success') {
                ami.action(
                    { action: 'queuelog', interface: channel, queue: data.queue, event: 'AGENTLOGIN', message: data.extension },
                    () => {}
                );
            }
        }
    );
}

function logoutQueuev2(socket, data) {
    let channel, extension;
    if (typeof data.extension !== 'undefined' && data.extension !== '') {
        channel = `Local/${data.extension}@from-queue/n`;
        extension = data.extension;
    } else {
        const userInfo = state.listUserConnected[socket.id];
        if (!userInfo || !userInfo.channel) return;
        channel = userInfo.channel;
        extension = userInfo.extension;
    }
    ami.action({ action: 'queueremove', interface: channel, queue: data.queue }, (err, res) => {
        if (err) console.log('Error LogoutQueue', err);
        else console.log('Success LogoutQueue', res);
    });
}

function pauseQueuev2(socket, data) {
    let channel;
    if (typeof data.extension !== 'undefined' && data.extension !== '') {
        channel = `Local/${data.extension}@from-queue/n`;
        const actionType = data.paused ? 'pause' : 'unpause';
        const command = `queue ${actionType} member ${channel} queue ${data.queue} reason "ACW"`;
        ami.action({ action: 'command', command }, (err, res) => {
            if (err) console.log('Error Pause/UnPause', err);
            if (res && res.response === 'Success') console.log('Success Pause/UnPause');
        });
    } else {
        const userInfo = state.listUserConnected[socket.id];
        if (!userInfo || !userInfo.channel) return;
        const command = `queue ${data.actionType} member ${userInfo.channel} queue ${data.queue} reason "${data.reason}"`;
        ami.action({ action: 'command', command }, () => {});
    }
}

function loginQueueWithAgentId(socket, data) {
    const userInfo = state.listUserConnected[socket.id];
    if (!userInfo || !userInfo.channel) return;
    const channel = `Local/${userInfo.agentId}@agentqueue/n`;
    ami.action(
        { action: 'queueadd', interface: channel, queue: data.queue, membername: userInfo.agentId, stateinterface: `hint:${userInfo.extension}@ext-local` },
        (errA, resA) => {
            if (resA.response === 'Success') {
                ami.action(
                    { action: 'queuelog', interface: channel, queue: data.queue, event: 'AGENTLOGIN', message: userInfo.extension },
                    (errB, resB) => {
                        if (resB.response === 'Success') {
                            ami.action({ action: 'command', command: `DATABASE PUT agentqueue ${userInfo.agentId} SIP/${userInfo.extension}` }, () => {});
                        }
                    }
                );
            }
        }
    );
}

function updateMisscall(data) {
    return data; // Exposed for socket handler to emit via io
}

function registerQueueSocketHandlers(socket, io) {
    socket.on('loginQueue', (data) => loginQueue(socket, data));
    socket.on('logoutQueue', (data) => logoutQueue(socket, data));
    socket.on('pauseQueue', (data) => pauseQueue(socket, data));
    socket.on('loginQueuev2', (data) => loginQueuev2(socket, data));
    socket.on('loginQueuev3', (data) => loginQueuev3(socket, data));
    socket.on('logoutQueuev2', (data) => logoutQueuev2(socket, data));
    socket.on('pauseQueuev2', (data) => pauseQueuev2(socket, data));
    socket.on('reloadQueuev2', () => {
        ami.action({ action: 'QueueSummary' }, () => {});
        ami.action({ action: 'QueueStatus' }, () => {});
    });
    socket.on('loginQueueWithAgentId', (data) => loginQueueWithAgentId(socket, data));
    socket.on('addMemberToQueue', (data) => {
        if ((!data.queue && !data.extension) || data.queue === '' || data.extension === '') return;
        ami.action(
            { action: 'QueueAdd', Queue: data.queue, Interface: `Local/${data.extension}@from-queue/n`, Penalty: data.penalty || 0 },
            () => { io.sockets.emit('addMemberToQueue', encodeDataToClient(data)); }
        );
    });
    socket.on('removeMemberInQueue', (data) => {
        if ((!data.queue && !data.extension) || data.queue === '' || data.extension === '') return;
        ami.action(
            { action: 'QueueRemove', Queue: data.queue, Interface: `Local/${data.extension}@from-queue/n` },
            () => { io.sockets.emit('removeMemberInQueue', encodeDataToClient(data)); }
        );
    });
    socket.on('updateMisscall', (data) => {
        const mess = { ...data };
        io.sockets.emit('updateRecall' + data.groupId, encodeDataToClient(mess));
    });
}

module.exports = { registerQueueSocketHandlers };
