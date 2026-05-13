import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { parseChannel, getTimeFormat } from './helpers';

export const SOCKET_RELAY: Array<[string, string]> = [
    ['coreshowchannel', 'showChannel'],
    ['queuememberpause', 'queuememberpause'],
    ['queuecallerleave', 'queuecallerleave'],
    ['queuememberstatus', 'queueMemberStatus'],
    ['queuememberremoved', 'queueMemberRemoved'],
    ['queuememberadded', 'queueMemberAdded'],
    ['queuemember', 'queueMember'],
    ['queuestatus', 'queueStatus'],
    ['chanspystart', 'chanspystart'],
    ['chanspystop', 'chanspystop'],
    ['peerstatus', 'peerStatus'],
];

const INTERNAL_CONTEXTS = ['from-internal', 'from-extensions', 'dialOne-with-exten'];
const OUTBOUND_CONTEXTS = ['trunk-dial-with-exten', 'from-internal-to-trunk'];
const INBOUND_CONTEXTS = ['from-pstn', 'from-trunk', 'from-mas', 'ext-queues', 'dial-with-exten'];

export function backupStateAsync(store: StoreService, backFilePath: string, logger: Logger) {
    try {
        if (!fs.existsSync(path.dirname(backFilePath))) {
            fs.mkdirSync(path.dirname(backFilePath), { recursive: true });
        }
        const payload = JSON.stringify({ arrDialState: store.arrDialState, arrBranchState: store.arrBranchState }, null, 2);
        fs.writeFile(backFilePath, payload, (err) => {
            if (err) logger.error('Backup state file write error:', err);
        });
    } catch (error) {
        logger.error('Backup state error:', error);
    }
}

export function restoreState(store: StoreService, backFilePath: string, logger: Logger) {
    try {
        if (fs.existsSync(backFilePath)) {
            const data = fs.readFileSync(backFilePath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object' && 'arrDialState' in parsed) {
                store.arrDialState = parsed.arrDialState || {};
                store.arrBranchState = parsed.arrBranchState || {};
            } else {
                store.arrDialState = parsed;
                store.arrBranchState = {};
            }
        }
    } catch (error) {
        logger.error('Restore state error:', error);
    }
}

export function classifyCall(data: any, calleridnum: string, connectedlinenum: string, destchannel: string) {
    let calltype = 'Unknown';
    if (OUTBOUND_CONTEXTS.includes(data.context)) {
        calltype = 'Outbound';
    } else if (INTERNAL_CONTEXTS.includes(data.context) || INTERNAL_CONTEXTS.includes(data.destcontext)) {
        calltype = 'Internal';
    } else if (INBOUND_CONTEXTS.includes(data.context)) {
        calltype = 'Inbound';
    } else {
        if (calleridnum.length > 5) calltype = 'Inbound';
        else if ((data.destcalleridnum || data.exten || '').length > 5) calltype = 'Outbound';
        else calltype = 'Internal';
    }

    let tonumber_val = '';
    if (calltype === 'Outbound') {
        tonumber_val = connectedlinenum !== '<unknown>' ? connectedlinenum : (data.destcalleridnum || data.exten || '');
    } else {
        const isLocal = destchannel.toLowerCase().startsWith('local/');
        const destExt = isLocal ? null : parseChannel(destchannel);
        tonumber_val = destExt || data.destcalleridnum || '';
    }

    return { calltype, tonumber_val };
}

export function isValidChannelForWebhook(channel: string, destchannel: string): boolean {
    const isChannelValid = channel.includes('SIP/') || channel.includes('LOCAL') || channel.includes('Local') || channel.includes('PJSIP');
    const isDestChannelValid = destchannel.includes('SIP/') || destchannel.includes('LOCAL') || destchannel.includes('Local') || destchannel.includes('PJSIP');
    return isChannelValid && isDestChannelValid;
}

export function buildMasterState(data: any, calleridnum: string, calltype: string, channel: string, destchannel: string, tonumber_val: string, linkedid: string, webhook_select: any, timeFormat: string) {
    return {
        fromnumber: calleridnum,
        calltype,
        channel,
        extension: destchannel.toLowerCase().startsWith('local/') ? (' ') : (parseChannel(destchannel) || ' '),
        starttime: timeFormat,
        status: 'initiating',
        destination: (calltype !== 'Outbound') ? data.exten : ' ',
        callrefid: linkedid,
        linkedid: linkedid,
        webhookurl: webhook_select?.webhook_url?.callcenter || '',
        recordingurl: webhook_select?.recording_url || '',
        groupid: webhook_select?.id || '',
        tonumber: tonumber_val,
        destchannel: destchannel,
    };
}

export function buildBranchState(master: any, calleridnum: string, destchannel: string, tonumber_val: string, linkedid: string, timeFormat: string) {
    return {
        fromnumber: calleridnum,
        calltype: master.calltype, // Kế thừa calltype từ master, tránh việc bị đổi thành Internal
        destchannel: destchannel,
        extension: parseChannel(destchannel) || ' ',
        tonumber: tonumber_val,
        destination: master.calltype !== 'Outbound' ? (master.destination || ' ') : ' ',
        starttime: timeFormat,
        status: 'initiating',
        webhookurl: master.webhookurl,
        recordingurl: master.recordingurl,
        groupid: master.groupid,
        callrefid: linkedid,
        linkedid,
        ...(master.queue ? { queue: master.queue } : {}),
    };
}

export function cleanupCallState(store: StoreService, pbxId: string, linkedid: string, backFilePath: string) {
    const namespacedLinkedid = `${pbxId}::${linkedid}`;
    delete store.arrDialState[namespacedLinkedid];
    for (const [uid, lid] of Object.entries(store.uniqueidToLinkedid)) {
        if (lid === namespacedLinkedid) delete store.uniqueidToLinkedid[uid];
    }
    for (const key of Object.keys(store.arrCompleteCall)) {
        if (key.startsWith(`${namespacedLinkedid}::`)) delete store.arrCompleteCall[key];
    }
    for (const key of Object.keys(store.arrBranchState)) {
        if (key.startsWith(`${namespacedLinkedid}::`)) delete store.arrBranchState[key];
    }
    // backupStateAsync(store, backFilePath);
}

export function createSyntheticCdr(channel: string, timeFormat: string) {
    return {
        synthetic: true,
        disposition: 'NOANSWER',
        duration: '0',
        billableseconds: '0',
        endtime: timeFormat,
        destinationchannel: channel,
    };
}

export function findWebhookByExtension(arrWebhook: any, ext: string) {
    for (const e in arrWebhook) {
        if (arrWebhook[e].extensions.indexOf(ext) > -1) {
            return arrWebhook[e];
        }
    }
    return null;
}

export function extractRecordingInfo(data: any) {
    if ((data.application === 'AGI' || data.application === 'MixMonitor') && data.appdata?.match('.WAV')) {
        const extChannel = data.channel || '';
        const curContext = data.context;
        const curAppData = data.appdata;
        const checkExt = parseChannel(extChannel) || '';
        let recordingFile = '';

        const resCallInfo = {
            src: data.calleridnum,
            dst: checkExt,
            call_type: '',
            recordingfile: '',
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
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
            return resCallInfo;
        }
    }
    return null;
}

export function resolveBranchOverride(branchState: any, channel: string, state: any, exten: string) {
    return branchState || {
        destchannel: channel,
        tonumber: (state.calltype !== 'Outbound') ? (parseChannel(channel) || state.tonumber) : state.tonumber,
        extension: parseChannel(channel) || ' ',
        destination: (state.calltype !== 'Outbound') ? (state.destination || ' ') : ' ',
    };
}

export function applyChannelStateUpdate(state: any, destchannel: string, data: any, status: string) {
    state.destchannel = destchannel;
    if (state.calltype !== 'Outbound') {
        state.tonumber = parseChannel(destchannel) || data.destcalleridnum || state.tonumber;
    }
    state.extension = parseChannel(destchannel) || ' ';
    state.destination = (state.calltype !== 'Outbound') ? (state.destination) : '';
    state.status = status;
}

export function buildMasterHangupOverride(state: any, data: any, wasAnswered = false) {
    const isMultiBranch = !!state.isMultiBranch;
    const channel = state.channel || data.channel || '';
    const connectedExtension = (data.connectedlinenum && data.connectedlinenum !== '<unknown>')
        ? data.connectedlinenum
        : '';
    if (isMultiBranch) {
        const answeredExtension = wasAnswered
            ? (connectedExtension || parseChannel(state.destchannel) || state.tonumber || '')
            : '';
        return {
            channel: channel,
            destchannel: answeredExtension ? (state.destchannel || '') : '',
            extension: answeredExtension,
            tonumber: answeredExtension,
            status: 'hangup',
        };
    }

    return {
        channel: channel,
        destchannel: state.channel,
        extension: parseChannel(state.channel) || state.fromnumber,
        tonumber: state.tonumber,
        status: 'hangup',
    };
}

export function updateMasterWebhookIfMissing(state: any, webhook_select: any) {
    if (!state.webhookurl && webhook_select) {
        state.webhookurl = webhook_select.webhook_url?.callcenter || '';
        state.recordingurl = webhook_select.recording_url || '';
        state.groupid = webhook_select.id || '';
    }
}

export function buildBranchKey(pbxId: string, linkedid: string, channel: string): string {
    return `${pbxId}::${linkedid}::${channel}`;
}

export function buildExtensionStatusPayload(data: any) {
    return {
        Exten: data.exten,
        StatusText: data.statustext,
        Channel: (data.hint || '').split(',')[0],
        Status: data.status,
    };
}

export function storeQueueCaller(store: StoreService, data: any, pbxId: string) {
    const key = `${pbxId}::${data.uniqueid}`;
    store.arrQueue[key] = { queue: data.queue, did: data.calleridnum };
}

export function applyAgentConnect(store: StoreService, data: any) {
    if (store.arrDialState[data.uniqueid]) {
        store.arrDialState[data.uniqueid].status = 'answered';
        store.arrDialState[data.uniqueid].answertime = getTimeFormat();
    }
}

export function buildQueueSummaryWebhook(arrWebhook: any, data: any): Array<{ url: string; params: any }> {
    const results: Array<{ url: string; params: any }> = [];
    for (const e in arrWebhook) {
        if (
            arrWebhook[e]['queues'].indexOf(data.queue) > -1 &&
            arrWebhook[e]['webhook_info']?.['call']?.indexOf('QueueSummary') > -1
        ) {
            results.push({
                url: arrWebhook[e]['webhook_url']['callcenter'],
                params: { object: 'call', event: 'QueueSummary', value: data },
            });
        }
    }
    return results;
}

export function storeChanspy(store: StoreService, data: any) {
    store.arrChanspy[data.uniqueid] = {
        uniqueid: data.uniqueid,
        channel: data.channel,
        chanspy_ext: '',
        starttime: getTimeFormat(),
    };
}

export function removeChanspy(store: StoreService, uniqueid: string) {
    delete store.arrChanspy[uniqueid];
}

export function resolveRecordingKey(store: StoreService, data: any): string {
    return store.arrRecordingFile[data.linkedid] ? data.uniqueid : data.linkedid;
}

export function buildDeviceStateWebhook(arrWebhook: any, data: any): Array<{ url: string; params: any }> {
    const ext = (data.device || '').split('/').pop() || '';
    const results: Array<{ url: string; params: any }> = [];
    for (const key in arrWebhook) {
        if (
            arrWebhook[key].extensions.indexOf(ext) > -1 &&
            arrWebhook[key]['webhook_url'] &&
            arrWebhook[key]['webhook_info']?.['call']?.indexOf('extstatus') > -1
        ) {
            results.push({
                url: arrWebhook[key]['webhook_url']['callcenter'],
                params: {
                    object: 'call',
                    event: 'AgentStatus',
                    value: { extension: ext, status: data.state.toLowerCase(), code: 200 },
                },
            });
        }
    }
    return results;
}

export function isValidCdrEvent(data: any): boolean {
    if (!data.destinationchannel || data.destinationchannel.startsWith('AppDial')) return false;
    if (data.destinationcontext === 'app-blackhole') return false;
    if (data.lastapplication !== 'Dial') return false;
    return true;
}

export function handleNoAnsweredCalls(state: any, branchState: any, channel: string, branchKey: string, arrCompleteCall: any): boolean {
    // Xác định nhánh "kẻ thắng cuộc": cuộc gọi đã được nghe VÀ đây chính là kênh đã nghe máy
    const isAnsweredBranch = state.status === 'answered' && channel === state.destchannel;
    // Tổng hợp CDR sớm (Synthetic CDR) khi:
    // 1. !!branchState    — Đây là kênh thật của Agent (không phải kênh Local/ ảo của Queue)
    // 2. !isAnsweredBranch — Nhánh này KHÔNG phải người đã nghe máy (là "kẻ thua cuộc" / gọi nhỡ)
    // 3. !arrCompleteCall  — Chưa có CDR thật nào từ Asterisk gửi về trước đó (tránh gửi trùng)
    return !!branchState && !isAnsweredBranch && !arrCompleteCall[branchKey];
}
