const express = require('express');
const router = express.Router();

const queueController = require('../controllers/queueController');
const callController = require('../controllers/callController');
const extensionController = require('../controllers/extensionController');
const blacklistController = require('../controllers/blacklistController');
const webhookController = require('../controllers/webhookController');
const phoneBridgeController = require('../controllers/phoneBridgeController');
// Queue
router.post('/addMemberToQueue', queueController.addMemberToQueue);
router.post('/removeMemberInQueue', queueController.removeMemberInQueue);
router.post('/pauseQueueAgent', queueController.pauseQueueAgent);
router.post('/queueStatus', queueController.getQueueStatus);
router.post('/getExtensionInQueue', queueController.getExtensionInQueue);

// Call
router.post('/click2call', callController.click2call);
router.post('/transferCall', callController.transferCall);
router.post('/muteCall', callController.muteCall);
router.post('/hangup', callController.hangup);
router.post('/holdCall', callController.holdCall);

// Extension
router.get('/getstatus', extensionController.getStatus);
router.post('/getstatus', extensionController.getStatus);

// Blacklist
router.post('/addBlacklist', blacklistController.addBlacklist);
router.post('/removeBlacklist', blacklistController.removeBlacklist);

// Webhook
router.get('/restartWebhook', webhookController.restartWebhook);

// PhoneBridge
router.get('/updateConfigPhoneBridge', phoneBridgeController.updateConfigPhoneBridge);
router.get('/getZohoConfig', phoneBridgeController.getZohoConfig);

module.exports = router;