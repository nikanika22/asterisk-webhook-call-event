const request = require('request');
const groupModel = require('../models/groupModel');
const state = require('../utils/store');

function getConfigPhoneBridge() {
    state.arrPhoneBridge = {};
    groupModel.getZohoConfigs().then((rows) => {
        if (rows) {
            rows.forEach((item) => {
                state.arrPhoneBridge[item.connector_server + '-' + item.extension] = { zohouser: item.zohouser };
            });
        }
        console.log('[PhoneBridge] Config loaded:', Object.keys(state.arrPhoneBridge).length, 'entries');
    }).catch(err => console.log(err.message));
}

function enableClick2CallPhoneBridge(data) {
    const params = {
        clicktodialuri: 'https://zohoclick2call.micxm.vn/api/dev/phonebridge-click2call',
        zohouser: data.zoho_user_id,
        clicktodialparam: [
            { name: 'secret', value: data.secret },
            { name: 'extension', value: data.extension },
        ],
    };
    const config = JSON.parse(data.config || '{}');
    const options = {
        method: 'POST', body: JSON.stringify(params), url: 'https://www.zohoapis.com/phonebridge/v3/users',
        rejectUnauthorized: false, headers: { Authorization: 'Zoho-oauthtoken ' + config.access_token, 'content-type': 'application/x-www-form-urlencoded' },
    };
    request(options, (err, res, body) => {
        if (err) { console.log(err); return; }
        try {
            body = JSON.parse(body);
            if (body.code === 'INVALID_TOKEN') generateToken(options, config, data.secret);
        } catch (e) {}
    });
}

function generateToken(options_clone, config, secret) {
    const optToken = {
        method: 'post', json: true, rejectUnauthorized: false, headers: {},
        url: `https://accounts.zoho.com/oauth/v2/token?refresh_token=${config.refresh_token}&client_id=1000.GAWRU6N276CF4520063138L32JTWBO&client_secret=96cb7c288ed91e7580dc7850121dc06e153722ad73&grant_type=refresh_token&redirect_uri=https://zendesk-connector.mipbx.vn:7001/phonebride-callback`,
        body: {},
    };
    request(optToken, (err, res, body) => {
        if (err) { console.log(err); return; }
        updateToken(secret, config, body);
    });
}

function updateToken(secret, config, data) {
    const cf = JSON.stringify(config);
    groupModel.updateConfigBySecret(secret, cf).then(() => {
        console.log('[PhoneBridge] Token updated');
    }).catch(err => console.log(err));
}

module.exports = { getConfigPhoneBridge, enableClick2CallPhoneBridge };
