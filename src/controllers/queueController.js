const queueService = require('../services/queueService');
const groupModel = require('../models/groupModel');

async function addMemberToQueue(req, res) {
    const data = req.body;
    if (!data.queue || !data.extension || data.queue === '' || data.extension === '') {
        return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'queue and extension cannot be null' } });
    }
    try {
        const result = await queueService.addMember(data);
        res.json({ success: true, data: { ...data, result } });
    } catch (err) {
        res.json({ success: false, error: { code: 'QUEUE_ADD_FAILED', message: 'Failed to add member to queue', details: err } });
    }
}

async function removeMemberInQueue(req, res) {
    const data = req.body;
    if (!data.queue || !data.extension || data.queue === '' || data.extension === '') {
        return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'queue and extension cannot be null' } });
    }
    try {
        const result = await queueService.removeMember(data);
        res.json({ success: true, data: { ...data, result } });
    } catch (err) {
        res.json({ success: false, error: { code: 'QUEUE_REMOVE_FAILED', message: 'Failed to remove member in queue', details: err } });
    }
}

async function pauseQueueAgent(req, res) {
    const data = req.body;
    if (!data.extension || !data.queue) {
        return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'extension and queue cannot be null' } });
    }
    try {
        await queueService.pauseMember(data);
        res.json({ success: true, message: 'update success' });
    } catch (err) {
        res.json({ success: false, error: { code: 'QUEUE_PAUSE_FAILED', message: 'Lỗi hệ thống khi tạm dừng', details: err } });
    }
}

async function getQueueStatus(req, res) {
    const data = req.body;
    if (!data || !data.queue) return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'queue is required' } });
    const queues = data.queue.split(',');
    const result = await queueService.queueStatus(queues);
    res.json({ success: true, data: { request: data, status: result } });
}

async function getExtensionInQueue(req, res) {
    const params = req.body;
    if (!params.queue || (!params.secret && !params.id) || params.queue.trim() === '') {
        return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'Params not valid' } });
    }
    groupModel.getExtensionsQueueFromGroup(params.queue, params.id, params.secret)
        .then(async (rows) => {
            if (!rows || rows.length === 0) return res.json({ success: true, data: [] });
            const hlExtsQueues = rows[0].hl_exts_queues.split('$$');
            try {
                const { arr, arrname } = await queueService.getExtensionInQueue(params.queue, hlExtsQueues);
                res.json({ success: true, data: arr, meta: { names: arrname } });
            } catch (e) {
                res.json({ success: true, data: [] });
            }
        })
        .catch(err => {
            console.error(err);
            res.json({ success: true, data: [] });
        });
}

module.exports = { addMemberToQueue, removeMemberInQueue, pauseQueueAgent, getQueueStatus, getExtensionInQueue };
