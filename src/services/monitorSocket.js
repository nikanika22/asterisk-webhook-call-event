const { getAMI } = require('../config/asterisk');
const state = require('../utils/store');
const callService = require('./callService');
const { checkExtension } = require('../utils/channelHelper');

const ami = getAMI();

function actionAMI(callInfo, data, userId, socket) {
    ami.action(callInfo, (err, res) => {
        if (res.response === 'Error') return;
        console.log(res);
    });
}

function registerMonitorSocketHandlers(socket, io) {
    socket.on('chanspy', (data) => {
        if (!data.extension) return;
        const userInfo = state.listUserConnected[socket.id];
        if (!userInfo) return;
        const userId = userInfo.accountId || '';
        const callInfo = { action: 'originate', application: 'chanspy', context: 'default', callerid: data.extension, exten: data.extension, channel: `SIP/${data.extension}`, data: `SIP/${data.spyExten},qw`, priority: 1, async: true, timeout: 30000 };
        ami.action(callInfo, (err, res) => {
            if (res.response === 'Error') socket.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: res.message }));
        });
    });

    socket.on('eavesDropCall', (data) => {
        if (!data.extension) return;
        const callInfo = { action: 'originate', application: 'chanspy', context: 'default', callerid: data.extension, exten: data.extension, channel: `SIP/${data.extension}`, data: `SIP/${data.spyExten},q`, priority: 1, async: true, timeout: 30000 };
        ami.action(callInfo, (err, res) => {
            if (res.response === 'Error') console.log('eavesdrop error', res.message);
        });
    });

    socket.on('pauseAgent', (data) => {
        if (!data.channel || !data.queue) return;
        const pauseAction = { Action: 'QueuePause', Interface: data.channel, Paused: data.paused || false, Queue: data.queue };
        ami.action(pauseAction, () => {});
    });

    socket.on('monitorAction', (data) => {
        const userInfo = state.listUserConnected[socket.id];
        if (!userInfo) return;
        const userId = userInfo.accountId || '';

        switch (data.type) {
            case 'hangupCall':
                actionAMI(data.callInfo, data, userId, socket);
                break;
            case 'chanspyCall': {
                const callInfo = { action: 'originate', application: 'chanspy', context: data.callInfo.context, callerid: `INVITE_SWP <0000${data.callInfo.spyExtension}>`, exten: data.callInfo.curExtension, channel: `Local/${data.callInfo.curExtension}@${data.callInfo.context}/n`, data: `SIP/${data.callInfo.spyExtension},qwE`, priority: 1, account: data.callInfo.account, async: true, timeout: 30000 };
                actionAMI(callInfo, data, userId, socket);
                break;
            }
            case 'eavesDropCall': {
                const callInfo = { action: 'originate', application: 'chanspy', context: data.callInfo.context, callerid: `INVITE_SPY <0000${data.callInfo.spyExtension}>`, exten: data.callInfo.curExtension, channel: `Local/${data.callInfo.curExtension}@${data.callInfo.context}/n`, data: `SIP/${data.callInfo.spyExtension},qE`, priority: 1, account: data.callInfo.account, async: true, timeout: 30000 };
                actionAMI(callInfo, data, userId, socket);
                break;
            }
            case 'meetMeCall': {
                const channel = `SIP/${data.callInfo.curExtension}`;
                const meetme = { action: 'originate', application: 'chanspy', context: data.callInfo.context, callerid: data.callInfo.curExtension, exten: data.callInfo.curExtension, channel, data: `SIP/${data.callInfo.spyExtension},qB`, priority: 1, async: true, timeout: 30000 };
                ami.action(meetme, (err, res) => { if (res.response !== 'Error') console.log(res); });
                break;
            }
        }
    });
}

module.exports = { registerMonitorSocketHandlers };
