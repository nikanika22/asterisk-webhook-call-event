const callService = require('../services/callService');

async function transferCall(req, res) {
    try {
        const result = await callService.transferCall(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({
            success: false,
            error: { code: 'TRANSFER_FAILED', message: err.message || 'Transfer call failed', details: err }
        });
    }
}

async function muteCall(req, res) {
    try {
        const result = await callService.muteCall(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({
            success: false,
            error: { code: 'MUTE_FAILED', message: err.message || 'Mute call failed', details: err }
        });
    }
}

async function hangup(req, res) {
    const data = req.body;
    if (typeof data.channel === 'undefined') {
        return res.json({
            success: false,
            error: { code: 'INVALID_PARAMS', message: 'channel not valid' }
        });
    }
    try {
        const result = await callService.hangupCall(data.channel);
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({
            success: false,
            error: { code: 'HANGUP_FAILED', message: err.message || 'Hangup failed', details: err }
        });
    }
}

async function holdCall(req, res) {
    try {
        const result = await callService.holdCall(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({
            success: false,
            error: { code: 'HOLD_FAILED', message: err.message || 'Hold call failed', details: err }
        });
    }
}

async function click2call(req, res) {
    try {
        const result = await callService.click2call(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({
            success: false,
            error: { code: 'CLICK2CALL_FAILED', message: err.message || 'Click2call failed', details: err }
        });
    }
}

function initCallEvent(req, res) {
    callService.callActionInitUserConnect();
    res.json({ success: true, message: 'init success' });
}

module.exports = { transferCall, muteCall, hangup, holdCall, click2call, initCallEvent };
