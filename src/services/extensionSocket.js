const { getAMI } = require('../config/asterisk');
const extensionService = require('./extensionService');
const state = require('../utils/store');
const webhookService = require('./webhookService');
const { encodeDataToBase } = require('../utils/encoder');
const { getTimeFormat } = require('../utils/dateHelper');
const { callActionInitUserConnect, callActionInitUserConnectv2 } = require('./callService');

const ami = getAMI();

function registerExtensionSocketHandlers(socket, io) {
    socket.on('userConnect', (clientConnect) => {
        if (typeof clientConnect.accountId === 'undefined') return;
        clientConnect.socketId = socket.id;

        if (clientConnect.extension) {
            console.log(`${getTimeFormat()} | Extension ${clientConnect.extension} connected`);
            clientConnect.channel = `Local/${clientConnect.extension}@from-queue/n`;
            setTimeout(() => {
                ami.action({ action: 'ExtensionState', exten: clientConnect.extension, Context: 'ext-local' }, (err, res) => {
                    if (res && res.response === 'Success') {
                        const outputParams = { Exten: clientConnect.extension, StatusText: res.statustext, Channel: res.hint.split(',')[0], Status: res.status };
                        io.sockets.emit('deviceStatus', encodeDataToClient(outputParams));
                    }
                });
            }, 1000);
        }

        if (clientConnect.queues) callActionInitUserConnectv2();
        if (!state.listUserConnected[socket.id]) state.listUserConnected[socket.id] = clientConnect;
    });

    socket.on('getStatusExtension', (req) => {
        ami.action({ action: 'ExtensionState', exten: req.extension, Context: 'ext-local' }, (err, res) => {
            if (res && res.response === 'Success') {
                const outputParams = { Exten: req.extension, StatusText: res.statustext, Channel: res.hint.split(',')[0], Status: res.status };
                io.sockets.emit('deviceStatus', encodeDataToClient(outputParams));
            }
        });
    });

    socket.on('actionPeerStatus', () => {
        ami.action({ action: 'SIPpeers' }, () => {});
    });

    socket.on('disconnect', () => {
        if (state.listUserConnected[socket.id]) {
            console.log(`User disconnect - ${socket.id}`);
            delete state.listUserConnected[socket.id];
        }
    });
}

module.exports = { registerExtensionSocketHandlers };
