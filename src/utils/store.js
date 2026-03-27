/**
 * Centralized in-memory state store.
 * All stateful arrays/objects shared across modules live here.
 */
const state = {
    // Call lifecycle tracking
    arrDialState: {},       // uniqueid → call data
    arrCompleteCall: {},    // uniqueid → CDR data
    arrRecordingFile: {},   // uniqueid/linkedid → recording info
    arrQueue: {},           // linkedid → { queue, did }
    arrChanspy: {},         // spyerUniqueid → chanspy info
    arrAbadon: {},          // uniqueid → abandoned call
    arrTransfer: {},
    arrCallError: {},       // uniqueid/linkedid → call error
    arrCustom: {},          // uniqueid → CRM custom vars
    arrVoiceMail: {},       // uniqueid → voicemail exten
    arrHangUpCall: {},
    flagEvent: {},          // callrefid → flag for completed/misscall

    // Webhook config cache (loaded from DB)
    arrWebhook: {},         // 'webhook-{id}' → webhook config

    // PhoneBridge config
    arrPhoneBridge: {},

    // Socket.IO connected users
    listUserConnected: {},  // socketId → user info

    // Extension activity tracking
    listExtActivity: {},    // extension → { lastState, lastCallDate }

    // Misc
    intervalInit: false,
    chonve_ApiToken: null,
};

module.exports = state;
