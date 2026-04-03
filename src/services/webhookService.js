const request = require('request');
const groupModel = require('../models/groupModel');
const state = require('../utils/store');
const axios = require('axios');
const webhookLogModel = require('../models/webhookLogModel');
const {
    encodeDataToBase
} = require('../utils/encoder');
const {
    getTimeFormat
} = require('../utils/dateHelper');
const {
    connectorServer
} = require('../env');

const BLOCKED_URLS = [
    'https://demo.cloudpro.vn/webhook.php?name=MiTekConnector&secret_key=a3eb8ce8c4a0e8659e95a1a5516af89e',
    'https://zendesk-cti.mipbx.vn/call',
    'https://zendesk-connector.mipbx.vn:7001/call',
    'https://zendesk-connector.mipbx.vn:7001/v2/call',
];
const FALLBACK_URL = 'https://webhook-chrome.mipbx.vn/call';

/**
 * Load webhook config from DB into state.arrWebhook
 */
function getWebhookInfo() {
    state.arrWebhook = {};
    groupModel.getActiveWebhooks(connectorServer).then((rows) => {
        rows.forEach((item) => {
            const keyHookName = 'webhook-' + item.id;
            if (state.arrWebhook[keyHookName] || !item.hl_exts_queues) return;
            const queues = [],
                extensions = [],
                did = [];
            const hlExtsQueues = item.hl_exts_queues.split('$$');
            hlExtsQueues.forEach((hlInfo) => {
                hlInfo = hlInfo.split('##');
                const extTmp = hlInfo[0].split(',');
                extTmp.forEach((ext) => {
                    if (extensions.indexOf(ext) === -1 && ext.length < 6) extensions.push(ext);
                    else if (did.indexOf(ext) === -1 && ext.length > 7) did.push(ext);
                    if (item.config != null) state.arrToken = state.arrToken || {};
                });
                const queueTmp = hlInfo[1].split(',');
                queueTmp.forEach((q) => {
                    if (queues.indexOf(q) === -1) queues.push(q);
                });
            });

            if (item.did) {
                item.did.split(',').forEach((e) => {
                    if (e.length > 7) did.push(e);
                });
            }
            console.log("extensions", extensions.length);
            item.did = did;
            item.extensions = extensions;
            item.queues = queues;
            item.webhook_info = item.webhook_info && item.webhook_info !== 'null' ? JSON.parse(item.webhook_info) : {};
            item.webhook_external = item.webhook_external && item.webhook_external !== 'null' ? JSON.parse(item.webhook_external) : {};
            item.webhook_url = item.webhook_url ? JSON.parse(item.webhook_url) : {};
            item.webhook_type = item.webhook_type && item.webhook_type !== 'null' ? JSON.parse(item.webhook_type) : {};
            state.arrWebhook[keyHookName] = item;
        });
        console.log('[Webhook] Loaded', Object.keys(state.arrWebhook).length, 'webhooks');
    }).catch(err => console.error('[Webhook] Error loading webhook info:', err.message));
}

/**
 * Check if a webhook dispatch is allowed by filter config.
 */
function checkPostRequest(params) {
    let flag = false;
    let webhook_select = false;
    for (const e in state.arrWebhook) {
        if (state.arrWebhook[e]['extensions'].indexOf(params.value.extension) > -1) {
            webhook_select = state.arrWebhook[e];
            break;
        }
    }
    if (!webhook_select) return false;
    if (webhook_select['webhook_type']['callcenter'] === 'default') {
        if (webhook_select['webhook_info'].hasOwnProperty(params.object)) {
            let type = '';
            if (['ringing', 'hangup', 'answered', 'completed', 'misscall'].indexOf(params.event) > -1) {
                if (params.value.calltype === 'InboundExtension') type = params.event + '_in';
                else if (params.value.calltype === 'OutboundExtension') type = params.event + '_out';
            } else if (params.event === 'AgentStatus') type = 'extstatus';
            if (webhook_select['webhook_info'][params.object].indexOf(type) > -1) flag = true;
            if (params.event === 'dialerror') flag = true;
        }
    }
    return flag;
}

function sendPostRequestv2(url = '', params) {
    if (!checkPostRequest(params)) return;

    // if (url === 'http://xeapi.chonve.vn/api/PhoneSvc/CallEvent') {
    //     sendPostRequestCustom(url, params);
    //     return;
    // }

    params.value.connector_server = connectorServer;

    // if (['4700', '4701', '4702'].indexOf(params.value.extension) > -1) {
    //     if (params.event === 'answered') {
    //         const phone = params.value.calltype === 'outbound' ? params.value.tonumber : params.value.fromnumber;
    //         request.get(url + phone, (err) => {
    //             if (err) console.log('Error', err);
    //             _cleanupAfterCall(params);
    //         });
    //     }
    //     return;
    // }

    if (params.event !== 'AgentStatus') {
        if (params.value.fromnumber && params.value.tonumber && params.value.fromnumber.length >= 5 || params.value.tonumber.length >= 5) {
            if (typeof params.value.groupid !== 'undefined' && params.value.groupid === '710') {
                const opts710 = _buildOpts(url, params);
                opts710.url = 'https://social-zoho-socket.micxm.vn/webhooksEventCall';
                request(opts710, _logHandler(opts710.url));
            }
            console.log(`--- ${params.event} : ${getTimeFormat()} - > ${params.value.fromnumber} ${params.value.calltype} ${params.value.tonumber}`);
            const opts = _buildOpts(url, params);
            request(opts, (err, res, body) => {
                if (err) {
                    console.log(err);
                    return;
                }
                _cleanupAfterCall(params);
                console.log(body);
            });
            if (BLOCKED_URLS.indexOf(url) > -1) {
                const opts2 = _buildOpts(FALLBACK_URL, params);
                request(opts2, (err) => {
                    if (!err) _cleanupAfterCall(params);
                });
            }
        }
    } else {
        request(_buildOpts(url, params), (err, res, body) => {
            if (!err) console.log(body);
        });
        if (BLOCKED_URLS.indexOf(url) > -1) {
            request(_buildOpts(FALLBACK_URL, params), () => { });
        }
    }
}
// dang sử dụng ở đây
async function sendWebhook(url, params) {
    if (!url) return;
    const id = await webhookLogModel.logPending(params, url);
    const MAX_RETRY = 3;
    const DELAY_BETWEEN_RETRY = 1000;
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
            const res = await axios.post(url, params);
            console.log(`[Webhook] send success (attempt ${attempt}): ${url}`);
            const responseData = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data;
            await webhookLogModel.updateStatus(id, 'sent', res.status, responseData, attempt);
            return;

        } catch (err) {

            console.log(`[Webhook] Attempt ${attempt}/${MAX_RETRY} failed: ${url}`);
            if (attempt < MAX_RETRY) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRY));
            } else {
                if (err.code === "ECONNREFUSED") {
                    await webhookLogModel.updateStatus(id, 'failed', 500, err.code, attempt);
                    return;
                }

                if (err.response) {
                    const errCode = err.response.status;
                    let errorMessage;
                    const data = err.response.data;
                    if (!data) {
                        errorMessage = `HTTP ${errCode}: ${err.response.statusText}`;
                    } else if (typeof data === 'object') {
                        errorMessage = JSON.stringify(data);
                    } else if (typeof data === 'string' && data.includes('<html')) {
                        errorMessage = `HTTP ${errCode}: ${err.response.statusText}`;
                    } else {
                        errorMessage = data;
                    }

                    await webhookLogModel.updateStatus(id, 'failed', errCode, errorMessage, attempt);
                    return;
                }
                await webhookLogModel.updateStatus(id, 'failed', 500, err.message || 'Unknown error', attempt);
            }
        }
    }
}

function _logHandler(url) {
    return (err, res, body) => {
        if (err) console.log('ERROR POST', url, JSON.stringify(err));
        else console.log('RESPONSE POST', url, JSON.stringify(body));
    };
}

function _cleanupAfterCall(params) {
    const id = params.value.callrefid;
    if (['completed', 'misscall'].indexOf(params.event) > -1) {
        if (state.arrDialState[id]) delete state.arrDialState[id];
        if (state.arrQueue[id]) delete state.arrQueue[id];
        if (state.flagEvent[id]) delete state.flagEvent[id];
    }
}

function sendPostRequestCustom(url, params) {
    if (params.event === 'AgentStatus') return;
    if (!params.value.fromnumber || params.value.fromnumber.length < 5) return;
    const options = {
        method: 'POST',
        body: JSON.stringify(params),
        headers: {
            'content-type': 'application/json',
            Authorization: 'Bearer ' + state.chonve_ApiToken
        },
        url,
        rejectUnauthorized: false
    };
    request(options, (err, res, body) => {
        if (err) {
            console.log(err);
            return;
        }
        if (!body || body === '') genToken(options);
        else console.log(JSON.stringify(body));
    });
}

function sendGetRequest(url, method = 'GET') {
    if (method === 'GET') {
        console.log(`*** ${getTimeFormat()} | ${url}`);
        request.get(url, (err, res, body) => {
            if (err) console.log('Error', err);
            else {
                console.log(body);
                console.log('----------------------------');
            }
        });
    }
}

function pushCallLog(webhook_select, uniqueid) {
    if (!state.arrCompleteCall[uniqueid]) return;
    const data = state.arrCompleteCall[uniqueid],
        calltype = 'calllog';
    const url = webhook_select['webhook_external']['callcenter'][calltype]['link'];
    const config = webhook_select['webhook_external']['callcenter']['config'];
    const method = webhook_select['webhook_external']['callcenter'][calltype]['method'];
    if (method !== 'GET') return;

    const option = [];
    let fullUrl = url + '?';
    Object.keys(config).forEach((e) => {
        if (config[e]['in'].indexOf(calltype) > -1) {
            switch (e) {
                case 'callid':
                    option.push(config[e].alias + '=' + uniqueid);
                    break;
                case 'duration':
                    option.push(config[e].alias + '=' + data.duration);
                    break;
                case 'status':
                    option.push(config[e].alias + '=' + data.disposition.replace(' ', '_'));
                    break;
                case 'calldate':
                    option.push(config[e].alias + '=' + (data.starttime.trim()).replace(' ', '-'));
                    break;
                case 'extension':
                    option.push(config[e].alias + '=' + (state.arrDialState[uniqueid] || {}).extension);
                    break;
                case 'phone':
                    option.push(config[e].alias + '=' + (state.arrDialState[uniqueid] || {}).phone);
                    break;
                case 'recordingfile': {
                    let recFile = '';
                    if (data.disposition.toLowerCase() === 'answered' && state.arrRecordingFile[uniqueid]) {
                        recFile = state.arrRecordingFile[uniqueid].recordingfile.substr(1);
                        const recording_url = (state.arrDialState[uniqueid] || {}).recordingurl + 'cvf.php?f=';
                        recFile = recording_url + encodeDataToBase(recFile);
                    }
                    option.push(config[e].alias + '=' + recFile);
                    break;
                }
                case 'secret':
                    option.push(config[e].alias + '=' + config[e].value);
                    break;
            }
        }
    });
    fullUrl += option.join('&');
    if (fullUrl) sendGetRequest(fullUrl, 'GET');
}

function makeCallError(data) {
    const ext = data.extension;
    let webhook_select = null;
    for (const e in state.arrWebhook) {
        if (state.arrWebhook[e]['extensions'].indexOf(ext) > -1) {
            webhook_select = state.arrWebhook[e];
            break;
        }
    }
    if (!webhook_select) return;
    const params = {
        object: 'call',
        event: 'dialerror',
        value: {
            status: data.code,
            code: data.code,
            message: data.message,
            extension: ext,
            calltype: 'OutboundExtension',
            calldate: getTimeFormat(),
            fromnumber: ext,
            tonumber: data.phone
        }
    };
    sendPostRequestv2(webhook_select['webhook_url']['callcenter'], params);
    delete state.arrCallError[data.linkedid];
}

function genToken(options_clone) {
    const options = {
        method: 'POST',
        url: 'http://xeapi.chonve.vn/api/AuthenSvc/Login',
        body: JSON.stringify({
            CodeName: 'XECALLPHONE',
            KeyPass: 'Xe@2020_01_01#XE',
            ClientId: 'MITEK'
        }),
        headers: {
            'content-type': 'application/json'
        }
    };
    request(options, (err, res, body) => {
        if (err) {
            console.log(err);
            return;
        }
        body = JSON.parse(body);
        if (body.code === '00' && body.isSuccess) {
            state.chonve_ApiToken = body.objectInfo.ApiToken;
            options_clone.headers.Authorization = 'Bearer ' + state.chonve_ApiToken;
            request(options_clone, (err2, res2, body2) => {
                if (!err2) console.log(body2);
            });
        }
    });
}

async function retryWebhook(id) {
    const log = await webhookLogModel.findById(id);
    if (!log) {
        return { success: false, error: { code: 'LOG_NOT_FOUND', message: 'Không tìm thấy webhook log' } };
    }
    if (log.status !== 'failed') {
        return { success: false, error: { code: 'LOG_NOT_FAILED', message: 'Chỉ retry được log có status failed' } };
    }
    let params;
    try {
        params = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
    } catch {
        return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Payload trong DB không hợp lệ' } };
    }

    const url = log.webhook_url;

    try {
        const res = await axios.post(url, params, { timeout: 2000 });
        const responseData = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data;
        console.log(`[Webhook] Retry success id=${id}: ${url}`);
        await webhookLogModel.updateRetriveStatus(id, 'sent', res.status, responseData);
        return { success: true, http_status: res.status, response: responseData };
    }
    catch (err) {
        const httpStatus = err.response?.status || 500;
        let errorMessage;
        const data = err.response?.data;
        if (!data) {
            errorMessage = `HTTP ${httpStatus}`;
        } else if (typeof data === 'object') {
            errorMessage = JSON.stringify(data);
        } else if (typeof data === 'string' && data.includes('<html')) {
            errorMessage = `HTTP ${httpStatus}`;
        } else {
            errorMessage = data;
        }
        if (err.code === "ECONNREFUSED") {
            console.log(`[Webhook] Retry failed id=${id}: ${url} - ${err.code}`);
            await webhookLogModel.updateRetriveStatus(id, 'failed', httpStatus, err.code);
            return { success: false, error: { code: 'RETRY_FAILED', message: err.code, http_status: httpStatus } };
        }
        console.error(`[Webhook] Retry failed id=${id}: ${url} - ${errorMessage}`);
        await webhookLogModel.updateRetriveStatus(id, 'failed', httpStatus, errorMessage);
        return { success: false, error: { code: 'RETRY_FAILED', message: errorMessage, http_status: httpStatus } };
    }
}



module.exports = {
    getWebhookInfo,
    checkPostRequest,
    sendPostRequestv2,
    sendGetRequest,
    pushCallLog,
    makeCallError,
    sendWebhook,
    retryWebhook,
}