const { encodeDataToClient } = require('../utils/encoder');
const state = require('../utils/store');

let ioInstance = null;

function setIO(io) {
    ioInstance = io;
}

function getIO() {
    return ioInstance;
}

/**
 * Emit to a specific user by their extension.
 */
function emitData(extension, data, type) {
    if (!ioInstance) return;
    Object.keys(state.listUserConnected).forEach((index) => {
        if (state.listUserConnected[index]['extension'] === extension) {
            ioInstance.sockets.emit(type + state.listUserConnected[index]['accountId'], data);
        }
    });
}

/**
 * Emit to all users subscribed to a queue or extension.
 * @param {string} event - Socket event name
 * @param {*} data - Raw data (will be encoded)
 * @param {string} type - 'queues' | 'extensions'
 * @param {string} check - queue name or extension to match
 */
function emitData2(event, data, type, check) {
    if (!ioInstance) return;
    for (const key in state.listUserConnected) {
        if (typeof check !== 'undefined') {
            if (state.listUserConnected[key][type] && state.listUserConnected[key][type].indexOf(check) > -1) {
                const socket = ioInstance.sockets.sockets.get(key);
                if (socket && typeof socket.emit === 'function' && typeof event !== 'undefined') {
                    socket.emit(event, encodeDataToClient(data));
                }
            }
        }
    }
}

module.exports = { setIO, getIO, emitData, emitData2 };
