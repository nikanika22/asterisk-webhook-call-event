const { getAMI } = require('../config/asterisk');
const { checkExtension } = require('../utils/channelHelper');
const { getTimeFormat } = require('../utils/dateHelper');
const ami = getAMI();
async function transferCall(params) {
    return new Promise((resolve, reject) => {
        if (!params.extension || !params.channel || !params.destchannel) {
            return reject({ code: 500, message: 'cannot transfer' });
        }
        let data = {};
        if (params.type === 'inbound') {
            if (params.status === 'ringing') {
                data = { Action: 'Redirect', Channel: params.channel, Exten: params.extension, Context: 'ext-local', ExtraExten: params.extension, ExtraChannel: params.destchannel, ExtraContext: 'from-internal', ExtraPriority: 1 };
            } else if (params.status === 'answered') {
                data = { Action: 'Redirect', Channel: params.channel, ExtraChannel: params.destchannel, Exten: params.extension, ExtraExten: params.channel, Context: 'astercc-onhold', ExtraContext: 'astercc-onhold', ExtraPriority: 2 };
            }
        }
        ami.action(data, (err, rq) => {
            if (err) return reject({ code: 500, status: 'Error', message: rq && rq.message });
            if (rq.response === 'Error') return reject({ code: 400, status: 'Error', message: 'cannot transfer' });
            resolve({ code: 200, status: 'Success', message: 'transfer success' });
        });
    });
}

async function muteCall(params) {
    return new Promise((resolve, reject) => {
        if (!params.channel) return reject({ code: 500, status: 'Error', message: 'cannot mute' });
        ami.action({ Action: 'MuteAudio', Channel: params.channel, Direction: params.direction, State: params.state }, (err, rq) => {
            if (err) return reject({ code: 500, status: 'Error', message: err });
            if (rq.response === 'Error') return reject({ code: 500, status: 'Error', message: 'cannot mute' });
            resolve({ code: 200, status: 'Success', message: 'mute success' });
        });
    });
}

async function hangupCall(channel) {
    return new Promise((resolve, reject) => {
        ami.action({ action: 'hangup', channel }, (err, rq) => {
            if (err) return reject({ code: 500, status: 'Error', message: err });
            if (rq.response === 'Success') return resolve({ code: 200, status: 'Success', message: 'hangup success' });
            reject({ code: 400, status: 'Error', message: 'channel not valid' });
        });
    });
}

async function holdCall(params) {
    return new Promise((resolve, reject) => {
        if (!params.channel || !params.destchannel) return reject({ code: 500, status: 'Error', message: 'cannot hold' });
        let data;
        if (params.type === 'hold') {
            data = { Action: 'Redirect', Channel: params.destchannel, Exten: 's', Context: 'astercc-onhold', Priority: 1 };
        } else if (params.type === 'unhold') {
            data = { Action: 'Bridge', Channel1: params.channel, Channel2: params.destchannel };
        } else {
            return reject({ code: 500, status: 'Error', message: 'type must be hold or unhold' });
        }
        ami.action(data, (err, rp) => {
            if (err) return reject({ code: 500, status: 'Error', message: err });
            resolve({ code: 200, status: 'Success', message: `${params.type} success` });
        });
    });
}

async function click2call(data) {
    return new Promise((resolve, reject) => {
        const callInfo = {
            action: 'originate', channel: data.channel, context: data.context,
            callerid: '1' + data.callerid, exten: data.callerid, priority: 1, async: true, variable: '',
        };
        ami.action(callInfo, (err, response) => {
            if (err) { console.log(`${getTimeFormat()} | Error Click2Call -->`, err); return reject(err); }
            console.log(`${getTimeFormat()} | Success Click2Call --> ${data.channel} - ${data.callerid}`);
            resolve(response);
        });
    });
}

function callActionInitUserConnect() {
    ami.action({ action: 'QueueSummary' }, () => {});
    ami.action({ action: 'QueueStatus' }, () => {});
    ami.action({ action: 'ExtensionStateList' }, () => {});
    ami.action({ action: 'CoreShowChannels' }, () => {});
}

function callActionInitUserConnectv2() {
    ami.action({ action: 'QueueSummary' }, () => {});
    ami.action({ action: 'QueueStatus' }, () => {});
}

function callActionUserStatus() {
    ami.action({ action: 'ExtensionStateList' }, () => {});
    ami.action({ action: 'CoreShowChannels' }, () => {});
}

module.exports = { transferCall, muteCall, hangupCall, holdCall, click2call, callActionInitUserConnect, callActionInitUserConnectv2, callActionUserStatus };
