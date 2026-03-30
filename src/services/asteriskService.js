const fs = require('fs');
const path = require('path');
const Back_File_Path = path.join(__dirname, 'dial_statebackup.json');
const EventEmitter = require('events');
const {
    getAMI
} = require('../config/asterisk');
const {
    AMI: amiConfig
} = require('../env');

class AMIEventBus extends EventEmitter { }
const asteriskService = new AMIEventBus();

function backupState() {
    try {
        fs.writeFileSync(Back_File_Path, JSON.stringify(state.arrDialState, null, 2));
    } catch (error) {
        console.error("Backup state error:", error);
    }
}

function restoreState() {
    try {
        if (fs.existsSync(Back_File_Path)) {
            const data = fs.readFileSync(Back_File_Path);
            state.arrDialState = JSON.parse(data);
        }
    } catch (error) {
        console.error("Restore state error:", error);
    }
}
let isStarted = false;
const ALLOWED_EVENTS = new Set([
    'dialbegin',
    'dialstate',
    'hangup',
    'cdr',
    'dialend'
    // 'extensionstatus'
]);

/**
 * Khởi động và gắn toàn bộ AMI listener.
 * Gọi hàm này SAU KHI server.listen() đã chạy thành công.
 */
function startAMI() {
    if (isStarted) return;
    isStarted = true;
    restoreState();
    const ami = getAMI();
    // Khi kết nối TCP thành công → subscribe events và bắt đầu lắng nghe
    ami.on('connect', () => {
        console.log('[AMI] Connected to', amiConfig.host + ':' + amiConfig.port);

        ami.action({
            action: 'Events',
            eventmask: 'all'
        }, (err, res) => {
            if (err) return console.error('[AMI] Failed to subscribe events:', err);
            console.log('[AMI] Event subscription:', res && res.response);
        });
    });
    // Tất cả events từ PBX sẽ đi qua đây và được phân phối đến handler bên dưới
    ami.on('managerevent', (evt) => {
        const eventName = (evt.event || '').toLowerCase();
        if (!ALLOWED_EVENTS.has(eventName)) {
            return;
        }
        console.log('[AMI] managerevent received:', eventName);
        console.log("data:", evt);
        if (eventName) {
            asteriskService.emit(eventName, evt);
        }
    });

    // DEBUG: Một số phiên bản asterisk-manager dùng tên 'event' thay vì 'managerevent'
    // ami.on('event', (evt) => {
    //     console.log('[AMI] raw event received:', evt.event);
    // });

    // // DEBUG: Bắt mọi raw data đi qua socket
    // ami.on('data', (data) => {
    //     console.log('[AMI] raw data chunk received');
    // });
}

const state = require('../utils/store');
const socketService = require('../config/socket');
const {
    encodeDataToClient
} = require('../utils/encoder');
const {
    getTimeFormat,
    getDurationTime
} = require('../utils/dateHelper');
const {
    checkExtension
} = require('../utils/channelHelper');
const {
    makeCallEvent,
    makeCallEventv2
} = require('./callEventService');
const {
    sendPostRequestv2
} = require('./webhookService');

// === Extension Status ===
asteriskService.on('extensionstatus', (data) => {
    const outputParams = {
        Exten: data.exten,
        StatusText: data.statustext,
        Channel: (data.hint || '').split(',')[0],
        Status: data.status
    };
    socketService.getIO() && socketService.getIO().sockets.emit('deviceStatus', encodeDataToClient(outputParams));
});

// === CoreShowChannels ===
asteriskService.on('coreshowchannel', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('showChannel', encodeDataToClient(data));
});

// === QueueMemberPause ===
asteriskService.on('queuememberpause', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queuememberpause', encodeDataToClient(data));
});

// === QueueCallerAbandon (Missed Call) ===
// asteriskService.on('queuecallerabandon', (data) => {
//     socketService.getIO() && socketService.getIO().sockets.emit('queuecallerabandon', encodeDataToClient(data));
//     if (state.arrDialState[data.uniqueid]) {
//         state.arrCompleteCall[data.uniqueid] = {
//             duration: data.holdtime,
//             billableseconds: 0
//         };
//         makeCallEvent('cdr', data.uniqueid);
//     }
// });

// === QueueCallerJoin / Leave ===
asteriskService.on('queuecallerjoin', (data) => {
    state.arrQueue[data.uniqueid] = {
        queue: data.queue,
        did: data.calleridnum
    };
    socketService.getIO() && socketService.getIO().sockets.emit('queuecallerjoin', encodeDataToClient(data));
});
asteriskService.on('queuecallerleave', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queuecallerleave', encodeDataToClient(data));
});

// === AgentConnect ===
asteriskService.on('agentconnect', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('agentconnect', encodeDataToClient(data));
    if (state.arrDialState[data.uniqueid]) {
        state.arrDialState[data.uniqueid].status = 'answered';
        state.arrDialState[data.uniqueid].answertime = getTimeFormat();
    }
});

// === Queue Status Events ===
asteriskService.on('queuememberstatus', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queueMemberStatus', encodeDataToClient(data));
});
asteriskService.on('queuememberremoved', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queueMemberRemoved', encodeDataToClient(data));
});
asteriskService.on('queuememberadded', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queueMemberAdded', encodeDataToClient(data));
});
asteriskService.on('queuemember', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queueMember', encodeDataToClient(data));
});

// === CDR ===
asteriskService.on('cdr', (data) => {
    if (state.arrDialState[data.uniqueid]) state.arrCompleteCall[data.uniqueid] = data;
    makeCallEventv2(data.event.toLowerCase(), data.uniqueid);
});

// === QueueSummary ===
asteriskService.on('queuesummary', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queueSummary', encodeDataToClient(data));
    for (const e in state.arrWebhook) {
        if (state.arrWebhook[e]['queues'].indexOf(data.queue) > -1 && state.arrWebhook[e]['webhook_info'] &&
            state.arrWebhook[e]['webhook_info']['call'] && state.arrWebhook[e]['webhook_info']['call'].indexOf('QueueSummary') > -1) {
            const params = {
                object: 'call',
                event: 'QueueSummary',
                value: data
            };
            sendPostRequestv2(state.arrWebhook[e]['webhook_url']['callcenter'], params);
        }
    }
});

// === QueueStatus ===
asteriskService.on('queuestatus', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('queueStatus', encodeDataToClient(data));
});

// === MeetMe ===
asteriskService.on('meetmejoin', (data) => {
    state.arrChanspy[data.uniqueid] = {
        uniqueid: data.uniqueid,
        channel: data.channel,
        chanspy_ext: '',
        starttime: getTimeFormat()
    };
    socketService.getIO() && socketService.getIO().sockets.emit('meetmejoin', encodeDataToClient(data));
});
asteriskService.on('meetmeleave', (data) => {
    delete state.arrChanspy[data.uniqueid];
    socketService.getIO() && socketService.getIO().sockets.emit('meetmeleave', encodeDataToClient(data));
});

// === ChanSpy ===
asteriskService.on('chanspystart', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('chanspystart', encodeDataToClient(data));
});
asteriskService.on('chanspystop', (data) => {
    socketService.getIO() && socketService.getIO().sockets.emit('chanspystop', encodeDataToClient(data));
});

// === DialBegin ===
asteriskService.on('dialbegin', (data) => {
    console.log("[1]arrWebhook", state.arrWebhook);
    const channel = data.channel || '';
    const destchannel = data.destchannel || '';
    const calleridnum = data.calleridnum || '';
    const connectedlinenum = data.connectedlinenum || '';
    let calltype = '';
    if (connectedlinenum.length < 5 && calleridnum.length < 5 && data.context) {
        calltype = 'Internal';
    } else if (connectedlinenum.length > 5 && calleridnum.length > 5 && data.context === "trunk-dial-with-exten") {
        calltype = 'Outbound';
    } else {
        calltype = 'Inbound';
    }
    if ((channel.indexOf('SIP/') > -1 || channel.indexOf('LOCAL') > -1) &&
        (destchannel.indexOf('SIP/') > -1 || destchannel.indexOf('LOCAL') > -1)) {
        const ext = checkExtension(channel);
        let webhook_select = null;
        for (const e in state.arrWebhook) {
            if (state.arrWebhook[e].extensions.indexOf(ext) > -1) {
                webhook_select = state.arrWebhook[e];
                break;
            }
        }
        if (webhook_select) {
            const uniqueid = data.uniqueid;
            state.arrDialState[uniqueid] = {
                fromnumber: calleridnum,
                tonumber: connectedlinenum,
                extension: ext,
                calltype: calltype,
                channel,
                destchannel,
                starttime: getTimeFormat(),
                status: 'initiating',
                callrefid: uniqueid,
                linkedid: data.linkedid,
                webhookurl: webhook_select['webhook_url']['callcenter'],
                recordingurl: webhook_select['recording_url'],
                groupid: webhook_select['id'],
            };
            backupState();
            console.log('dialbegin  :   ', state.arrDialState[uniqueid]);
            makeCallEventv2('ringing', uniqueid);
        }
    }
    //socketService.getIO() && socketService.getIO().sockets.emit('dialbegin', encodeDataToClient(data));
});

// === DialEnd / DialState ===
asteriskService.on('dialend', (data) => {

    //socketService.getIO() && socketService.getIO().sockets.emit('dialend', encodeDataToClient(data));
    if (data.dialstatus == 'ANSWER') {
        state.arrDialState[data.uniqueid].status = 'answered';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
        makeCallEventv2(state.arrDialState[data.uniqueid].status, data.uniqueid);
        backupState();
    } else if (data.dialstatus == 'NOANSWER') {
        state.arrDialState[data.uniqueid].status = 'noanswer';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
        backupState();
    } else if (data.dialstatus == 'CONGESTION') {
        state.arrDialState[data.uniqueid].status = 'congestion';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
        backupState();
    } else if (data.dialstatus == 'CANCEL') {
        state.arrDialState[data.uniqueid].status = 'cancelled';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
        backupState();
    }
});


asteriskService.on('dialstate', (data) => {

    if (data.dialstatus == 'RINGING') {
        state.arrDialState[data.uniqueid].status = 'ringing';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
    } else if (data.dialstatus == 'NOANSWER') {
        state.arrDialState[data.uniqueid].status = 'noanswer';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
    } else if (data.dialstatus == 'CONGESTION') {
        state.arrDialState[data.uniqueid].status = 'congestion';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
    } else if (data.dialstatus == 'CANCELLED') {
        state.arrDialState[data.uniqueid].status = 'cancelled';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
    } else if (data.dialstatus == 'PROGRESS') {
        state.arrDialState[data.uniqueid].status = 'progress';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
    } else if (data.dialstatus == 'BUSY') {
        state.arrDialState[data.uniqueid].status = 'busy';
        console.log('dialstatus:    ', state.arrDialState[data.uniqueid]);
    }
    backupState();
});

// === Hangup ===
asteriskService.on('hangup', (data) => {
    const uniqueid = data.uniqueid;
    if (state.arrDialState[uniqueid]) {
        state.arrDialState[uniqueid].status = 'hangup';
        makeCallEventv2('hangup', data.uniqueid);
        console.log('hangup:   ', state.arrDialState[uniqueid]);
        delete state.arrDialState[uniqueid];
        if (fs.existsSync(Back_File_Path)) {
            fs.unlinkSync(Back_File_Path);
            console.log('Delete sucessful');
        }
    }
});

// === Manager Event (catch-all) ===
asteriskService.on('managerevent', (data) => {
    const io = socketService.getIO();
    const event = (data.event || '').toUpperCase();

    if (event === 'CDR') {
        if (state.arrDialState[data.uniqueid]) state.arrCompleteCall[data.uniqueid] = data;
    }

    if (event === 'NEWEXTEN' && (data.application === 'AGI' || data.application === 'MixMonitor') && data.appdata && data.appdata.match('.WAV')) {
        const extChannel = data.channel || '',
            curContext = data.context,
            curAppData = data.appdata;
        let checkExt = '',
            recordingFile = '';
        if (extChannel.match('SIP/')) checkExt = extChannel.substring(extChannel.lastIndexOf('SIP/') + 4, extChannel.lastIndexOf('-'));
        else if (extChannel.match('Local/')) checkExt = extChannel.substring(extChannel.lastIndexOf('Local/') + 6, extChannel.lastIndexOf('@'));
        const resCallInfo = {
            src: data.calleridnum,
            dst: checkExt,
            call_type: '',
            recordingfile: '',
            uniqueid: data.uniqueid,
            linkedid: data.linkedid
        };
        if (curContext === 'sub-record-check' || curContext === 'agentqueue') {
            resCallInfo.call_type = 'in';
            recordingFile = curAppData.split(',')[0];
        } else if (curContext === 'macro-hangupcall') {
            resCallInfo.call_type = 'out';
            resCallInfo.src = checkExt;
            resCallInfo.dst = data.connectedlinenum;
            recordingFile = curAppData.split(',')[2];
        }
        recordingFile = (recordingFile || '').replace('data/callrecording/', '');
        if (recordingFile) {
            resCallInfo.recordingfile = recordingFile;
            state.arrRecordingFile[state.arrRecordingFile[data.linkedid] ? data.uniqueid : data.linkedid] = resCallInfo;
        }
    }

    if (event === 'PEERSTATUS') io && io.sockets.emit('peerStatus', encodeDataToClient(data));

    if (event === 'DEVICESTATECHANGE') {
        const ext = (data.device || '').split('/').pop();
        for (const key in state.arrWebhook) {
            if (state.arrWebhook[key].extensions.indexOf(ext) > -1 && state.arrWebhook[key]['webhook_url'] &&
                state.arrWebhook[key]['webhook_info'] && state.arrWebhook[key]['webhook_info']['call'] &&
                state.arrWebhook[key]['webhook_info']['call'].indexOf('extstatus') > -1) {
                const params = {
                    object: 'call',
                    event: 'AgentStatus',
                    value: {
                        extension: ext,
                        status: data.state.toLowerCase(),
                        code: 200
                    }
                };
                sendPostRequestv2(state.arrWebhook[key]['webhook_url']['callcenter'], params);
            }
        }
    }
});

module.exports = {
    startAMI,
    asteriskService
};