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

module.exports = { restartWebhook };
