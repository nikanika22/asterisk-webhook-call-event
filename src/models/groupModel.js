const BaseModel = require('./baseModel');

class GroupModel extends BaseModel {
    constructor() {
        super('groups');
    }

    /**
     * Lấy cấu hình webhook và danh sách extension/queue (Join với group_hotline)
     * Dùng cho việc load config webhook lúc khởi động server.
     */
    async getActiveWebhooks(connectorServer) {
        const sql = `
            SELECT g.id, g.did, g.groupName, g.secret, g.config, g.socket_url, g.webhook_url, 
                   g.webhook_info, g.recording_url, g.voice_mail_context as voice_mail, 
                   g.webhook_external, g.api_status, g.webhook_type, g.webhook_custom_var, 
                   (SELECT GROUP_CONCAT(CONCAT_WS('##', gh.extensions, gh.queues) SEPARATOR '$$') 
                    FROM group_hotline gh 
                    WHERE gh.groupId = g.id AND gh.status='publish') AS hl_exts_queues 
            FROM groups g 
            WHERE g.webhook_active > 0 AND g.status = 'active' AND g.api_status= 'enable' 
              AND g.connector_server = ?
        `;
        return this.query(sql, [connectorServer]);
    }

    async getBySecret(secret) {
        const sql = `SELECT * FROM groups WHERE secret = ?`;
        return this.query(sql, [secret]);
    }

    /**
     * Dành cho module PhoneBridge: Left Join với zoho_config
     */
    async getZohoConfigs() {
        const sql = `
            SELECT groups.connector_server, zoho_config.extension, zoho_config.zohouser, zoho_config.email 
            FROM groups 
            LEFT JOIN zoho_config ON zoho_config.groupId = groups.id 
            WHERE groups.config LIKE '%zoho-phonebridge%' AND zoho_config.status = 1
        `;
        return this.query(sql);
    }

    async getZohoConfigBySecret(secret) {
        const sql = `
            SELECT groups.id, groups.config, groups.secret, zoho_config.extension, zoho_config.zoho_user_id 
            FROM groups 
            LEFT JOIN zoho_config ON zoho_config.groupId = groups.id 
            WHERE secret = ?
        `;
        return this.query(sql, [secret]);
    }

    async getExtensionsQueueFromGroup(queue, id, secret) {
        let sql = `SELECT g.secret, (SELECT GROUP_CONCAT(CONCAT_WS('##',gh.extensions, gh.queues) SEPARATOR '$$') 
                   FROM group_hotline gh 
                   WHERE gh.groupId = g.id AND gh.status='publish' AND gh.queues LIKE ?) AS hl_exts_queues 
                   FROM groups g `;
        let params = ['%' + queue + '%'];
        
        if (id) {
            if (id !== '1') {
                sql += `WHERE g.id = ? `;
                params.push(id);
            }
        } else {
            sql += `WHERE g.secret = ? `;
            params.push(secret);
        }
        sql += ' HAVING hl_exts_queues IS NOT NULL LIMIT 1';
        
        return this.query(sql, params);
    }

    async updateConfigBySecret(secret, configStr) {
        const sql = `UPDATE groups SET config = ? WHERE secret = ?`;
        return this.query(sql, [configStr, secret]);
    }
}

module.exports = new GroupModel();
