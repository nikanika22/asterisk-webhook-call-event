const { getAMI } = require('../config/asterisk');
const callService = require('./callService');
const state = require('../utils/store');
const { emitData2 } = require('../config/socket');
const { checkExtension } = require('../utils/channelHelper');
const { callActionInitUserConnect, callActionInitUserConnectv2, callActionUserStatus } = require('./callService');

const ami = getAMI();

function registerCallSocketHandlers(socket, io) {
    socket.on('click2call', (req) => {
        const data = state.listUserConnected[socket.id];
        if (!Array.isArray(state.listUserConnected) || typeof data === 'undefined') return;
        const called = req.called, caller = data.extension || '', channel = data.channelOut || '', context = data.context || '';
        const userId = data.accountId || '';
        if (!caller || !called) { socket.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: 'Empty caller or called.' })); return; }
        const callInfo = { action: 'originate', channel, context, callerid: caller, exten: called, priority: 1, async: true, variable: req.variables || {} };
        ami.action(callInfo, (err, res) => {
            if (res.response === 'Error') { socket.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: res.message })); return; }
            const mess = { type: 'recall', queuelog_misscall_id: req.id, userId: req.userId || '', userName: req.userName || '', groupId: data.groupId || '' };
            io.sockets.emit('updateRecall' + data.groupId, encodeDataToClient(mess));
        });
    });

    socket.on('hangupCall', (req) => {
        const data = state.listUserConnected[socket.id];
        if (!data) return;
        const userId = data.accountId || '', channel = req.channel || '';
        if (!channel) { socket.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: 'Empty info, can not hangup.' })); return; }
        ami.action({ action: 'hangup', channel }, (err, res) => {
            if (res.response === 'Error') socket.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: res.message }));
        });
    });

    socket.on('transferCall', (data) => {
        ami.action({ Action: 'Redirect', Channel: data.channel, Exten: data.extension, Context: 'from-internal-xfer', Priority: 1 }, (err, rq) => {
            if (rq.response === 'Error') socket.emit('messageBox' + data.userId, encodeDataToClient({ type: 'error', message: 'Cannot Transfer' }));
            else socket.emit('messageBox' + data.userId, encodeDataToClient({ type: 'success', message: 'Transfer Success' }));
        });
    });

    socket.on('reinitcall', () => callActionInitUserConnect());
    socket.on('initCallAction', () => callActionInitUserConnect());
    socket.on('initCallActionStatus', () => callActionUserStatus());
    socket.on('reinitCoreShowChannel', () => ami.action({ action: 'CoreShowChannels' }, () => {}));
}

module.exports = { registerCallSocketHandlers };
