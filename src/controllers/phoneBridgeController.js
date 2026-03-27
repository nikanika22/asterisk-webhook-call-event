const groupModel = require('../models/groupModel');
const phoneBridgeService = require('../services/phoneBridgeService');

function updateConfigPhoneBridge(req, res) {
    phoneBridgeService.getConfigPhoneBridge();
    res.json({ success: true, message: 'Configuration update initiated' });
}

function getZohoConfig(req, res) {
    const { secret } = req.query;
    if (!secret) return res.json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'Invalid Secret' } });
    
    groupModel.getZohoConfigBySecret(secret).then((rows) => {
        if (rows && rows.length > 0) {
            rows.some((item) => phoneBridgeService.enableClick2CallPhoneBridge(item));
        }
        res.json({ success: true, message: 'OK' });
    }).catch(err => {
        console.error(err);
        res.json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Lỗi truy xuất cài đặt Zoho', details: err.message } });
    });
}

module.exports = { updateConfigPhoneBridge, getZohoConfig };
