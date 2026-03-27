const blacklistService = require('../services/blacklistService');

function addBlacklist(req, res) {
    const result = blacklistService.addBlacklist(req.body);
    if (result.code === 200) {
        res.json({ success: true, message: result.message });
    } else {
        res.json({ success: false, error: { code: 'BLACKLIST_ADD_ERROR', message: result.message } });
    }
}

function removeBlacklist(req, res) {
    const result = blacklistService.removeBlacklist(req.body);
    if (result.code === 200) {
        res.json({ success: true, message: result.message });
    } else {
        res.json({ success: false, error: { code: 'BLACKLIST_REMOVE_ERROR', message: result.message } });
    }
}

module.exports = { addBlacklist, removeBlacklist };
