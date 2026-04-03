const webhookService = require('../services/webhookService');
const groupModel = require('../models/groupModel');

async function restartWebhook(req, res) {
    const { secret } = req.query;
    if (!secret) return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'secret not valid' } });
    groupModel.getBySecret(secret).then((rows) => {
        if (!rows || rows.length === 0) return res.json({ success: false, error: { code: 'WEBHOOK_INVALID_SECRET', message: 'secret not valid' } });
        webhookService.getWebhookInfo();
        res.json({ success: true, message: 'reload success' });
    }).catch(err => res.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'DB validation failed', details: err.message } }));
}

async function retryWebhook(req, res) {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PARAMETERS', message: 'id là bắt buộc' }
        });
    }
    try {
        const result = await webhookService.retryWebhook(Number(id));
        if (!result.success) {
            if (result.error.code === 'RETRY_FAILED') {
                return res.status(200).json(result);
            }
            const statusCode = result.error.code === 'LOG_NOT_FOUND' ? 404 : 400;
            return res.status(statusCode).json(result);
        }
        return res.json(result);
    } catch (err) {
        console.log(err);
        console.error('[Controller] retryWebhook error:', err.message);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi server' }
        });
    }
}

module.exports = { restartWebhook, retryWebhook };
