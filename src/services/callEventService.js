const state = require('../utils/store');
const {
    encodeDataToClient,
    encodeDataToBase
} = require('../utils/encoder');
const {
    getTimeFormat,
    getDurationTime
} = require('../utils/dateHelper');
const webhookService = require('./webhookService');
const socketService = require('../config/socket');

function makeCallEvent(type, callid) {
    if (!state.arrDialState[callid]) return;
    const io = socketService.getIO();
    const params = {
        object: 'call',
        event: type,
        value: {}
    };
    const data = JSON.parse(JSON.stringify(state.arrDialState[callid]));
    params.value = data;
    switch (type) {
        case 'answered':
            data.status = 'answered';
            data.answertime = getTimeFormat();
            state.arrDialState[callid].answertime = getTimeFormat();
            state.arrDialState[callid].status = 'answered';
            break;
        case 'hangup':
            data.endtime = getTimeFormat();
            params.value.endtime = getTimeFormat();
            state.arrDialState[callid].endtime = params.value.endtime;
            params.value.duration = getDurationTime(getTimeFormat(), state.arrDialState[callid].starttime);
            params.value.billsec = data.status === 'answered' ? getDurationTime(getTimeFormat(), state.arrDialState[callid].answertime) : 0;
            break;
        case 'cdr':
            if (data.status === 'answered') {
                params.event = 'completed';
                params.value.duration = state.arrCompleteCall[callid].duration;
                params.value.billsec = state.arrCompleteCall[callid].billableseconds;
                params.value.recording_file = '';
                if (state.arrRecordingFile[callid]) {
                    const recFile = state.arrRecordingFile[callid].recordingfile.substr(1);
                    params.value.recording_file = data.recordingurl + 'cvf.php?f=' + encodeDataToBase(recFile);
                } else if (state.arrRecordingFile[state.arrDialState[callid].destlinkedid]) {
                    const recFile = state.arrRecordingFile[state.arrDialState[callid].destlinkedid].recordingfile.substr(1);
                    params.value.recording_file = data.recordingurl + 'cvf.php?f=' + encodeDataToBase(recFile);
                }
            } else {
                params.event = 'misscall';
                params.value.recording_file = '';
                params.value.duration = state.arrCompleteCall[callid].duration;
                params.value.billsec = '0';
            }
            break;
    }

    delete params.value.webhookurl;
    delete params.value.recordingurl;
    if (params.value.calltype === 'Local') return;
    if (params.event === 'completed' || params.event === 'misscall') {
        setTimeout(() => {
            state.flagEvent[params.value.callrefid] = true;
        }, 1000);
    }
    if (io) io.sockets.emit('callEvent', encodeDataToClient(params));
}



//dang sử dụng nè:
function makeCallEventv2(type, callid) {
    if (!state.arrDialState[callid]) return;
    const params = {
        object: 'call',
        event: type,
        value: {}
    };
    const data = JSON.parse(JSON.stringify(state.arrDialState[callid]));
    params.value = data;

    switch (type) {
        case 'answered':
            data.status = 'answered';
            data.answertime = getTimeFormat();
            state.arrDialState[callid].answertime = getTimeFormat();
            state.arrDialState[callid].status = 'answered';
            break;
        case 'hangup':
            data.endtime = getTimeFormat();
            params.value.endtime = getTimeFormat();
            params.value.duration = getDurationTime(getTimeFormat(), state.arrDialState[callid].starttime);
            params.value.billsec = data.status === 'answered' ? getDurationTime(getTimeFormat(), state.arrDialState[callid].answertime) : 0;
            break;
        case 'cdr':
            if (data.status === 'answered') {
                params.event = 'completed';
                params.value.duration = state.arrCompleteCall[callid].duration;
                params.value.billsec = state.arrCompleteCall[callid].billableseconds;
                params.value.recording_file = '';
                // if (state.arrRecordingFile[callid]) {
                //     const recFile = state.arrRecordingFile[callid].recordingfile.substr(1);
                //     params.value.recording_file = data.recordingurl + 'cvf.php?f=' + encodeDataToBase(recFile);
                // }
            } else {
                params.event = 'misscall';
                params.value.recording_file = '';
                params.value.duration = state.arrCompleteCall[callid].duration;
                params.value.billsec = '0';
            }
            break;
    }

    const url = params.value.webhookurl;
    delete params.value.webhookurl;
    delete params.value.recordingurl;
    if (type === "cdr") {
        setTimeout(() => {
            webhookService.sendWebhook(url, params);
        }, 2000);
    }
    else {
        webhookService.sendWebhook(url, params);
    }
}
module.exports = {
    makeCallEvent,
    makeCallEventv2
};