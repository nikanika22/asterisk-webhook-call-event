const BaseModel = require('./baseModel');

class WebhookLogModel extends BaseModel {
    constructor() {
        super('mi_webhook_log');
    }
    async logPending(params, url) {
        try {
            const dataToInsert = {
                call_uniqueid: params.value?.callrefid || null,
                call_refid: params.value?.callrefid || null,
                event_type: params.event || null,
                webhook_url: url,
                payload: JSON.stringify(params),
                status: 'pending',
                attempt_count: 1,
                created_at: new Date(),
            };
            const result = await this.create(dataToInsert);
            return result.insertId;
        } catch (error) {
            console.error('[DB] Lỗi insert log webhook:', error.message);
            return null;
        }
    }
    async updateStatus(id, status, httpStatus, responseBody) {
        if (!id) return;
        try {
            const dataUpdate = {
                status: status,
                http_status: httpStatus || null,
                response_body: responseBody ? String(responseBody) : null,
                sent_at: new Date(),
                last_attempt_at: new Date()
            };
            await this.update(id, dataUpdate);
        }
        catch (error) {
            console.error('[DB] Lỗi update status webhook:', error.message);
        }
    }
}

module.exports = new WebhookLogModel();