const extensionService = require('../services/extensionService');

async function getStatus(req, res) {
    const { extension } = req.body;
    if (!extension) {
        return res.json({
            success: false,
            error: {
                code: 'INVALID_PARAMS',
                message: 'params không hợp lệ'
            }
        });
    }
    try {
        const result = await extensionService.getExtensionStatus(extension);
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: err.message || 'Lỗi hệ thống'
            }
        });
    }
}

module.exports = { getStatus };
