import {
  Injectable, Inject, Logger, OnApplicationBootstrap,
} from '@nestjs/common';
import { Pool } from 'mysql';
import axios from 'axios';
import * as request from 'request';
import { ConfigService } from '@nestjs/config';
import { DATABASE_POOL } from '../../shared/database/database.providers';
import { StoreService } from '../../shared/store/store.service';
import { encodeDataToBase, getTimeFormat } from '../../shared/helpers/helpers';
import { getRuntimeConfig } from '../../core/config/runtime-config';

const BLOCKED_URLS = [
  'https://demo.cloudpro.vn/webhook.php?name=MiTekConnector&secret_key=a3eb8ce8c4a0e8659e95a1a5516af89e',
  'https://zendesk-cti.mipbx.vn/call',
  'https://zendesk-connector.mipbx.vn:7001/call',
  'https://zendesk-connector.mipbx.vn:7001/v2/call',
];
const FALLBACK_URL = 'https://webhook-chrome.mipbx.vn/call';

@Injectable()
export class WebhookService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WebhookService.name);
  private readonly CONNECTOR_SERVER: string;

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly store: StoreService,
    private readonly configService: ConfigService,
  ) {
    this.CONNECTOR_SERVER = this.configService.get<string>('CONNECTOR_SERVER') || '';
  }

  onApplicationBootstrap() {
    setTimeout(() => {
      this.getWebhookInfo();
    }, getRuntimeConfig().setTimeoutMs);
  }
  // --- DB Helpers ---
  private query(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (error, results) => {
        if (error) {
          this.logger.error(`[DB Error] ${error.message}`);
          return reject(error);
        }
        resolve(results);
      });
    });
  }

  async getActiveWebhooks(connectorServer: string) {
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

  async getGroupById(secret: string) {
    const sql = `SELECT * FROM groups WHERE secret = ?`;
    return this.query(sql, [secret]);
  }

  async logPending(params: any, url: string) {
    try {
      const contactNumber = params.value?.calltype === 'Inbound' 
        ? params.value?.fromnumber 
        : params.value?.tonumber;

      const dataToInsert = {
        call_uniqueid: params.value?.callrefid || null,
        call_refid: params.value?.callrefid || null,
        event_type: params.event || null,
        webhook_url: url,
        payload: JSON.stringify(params),
        status: 'pending',
        attempt_count: 0,
        contact_number: contactNumber || null,
        created_at: new Date(),
        sent_at: new Date(),
      };
      const sql = `INSERT INTO mi_webhook_log SET ?`;
      const result = await this.query(sql, [dataToInsert]);
      return result.insertId;
    } catch (error: any) {
      this.logger.error(`[DB] Lỗi insert log webhook: ${error.message}`);
      return null;
    }
  }

  async updateStatus(id: number, status: string, httpStatus: number | null, responseBody: string | null, attempt: number) {
    if (!id) return;
    try {
      const dataUpdate = {
        status: status,
        http_status: httpStatus || null,
        response_body: responseBody ? String(responseBody) : null,
        last_attempt_at: new Date(),
        attempt_count: attempt,
      };
      const sql = `UPDATE mi_webhook_log SET ? WHERE id = ?`;
      await this.query(sql, [dataUpdate, id]);
    } catch (error: any) {
      this.logger.error(`[DB] Lỗi update status webhook: ${error.message}`);
    }
  }

  async updateRetriveStatus(id: number, status: string, httpStatus: number | null, responseBody: string | null) {
    if (!id) return;
    try {
      const sql = `UPDATE mi_webhook_log SET ? WHERE id = ?`;
      await this.query(sql, [{
        status: status,
        http_status: httpStatus || null,
        response_body: responseBody ? String(responseBody) : null,
        retrive_status: status,
        retrive_at: new Date(),
      }, id]);
    } catch (error: any) {
      this.logger.error(`[DB] Lỗi update retrive status: ${error.message}`);
    }
  }

  async getAllLog() {
    try {
      const sql = `SELECT * FROM mi_webhook_log`;
      return await this.query(sql);
    } catch (error: any) {
      this.logger.error(`[DB] Lỗi get all log: ${error.message}`);
      return [];
    }
  }

  // --- Core Webhook Logic ---
  async getWebhookInfo() {
    this.store.arrWebhook = {};
    try {
      const rows = await this.getActiveWebhooks(this.CONNECTOR_SERVER);
      rows.forEach((item: any) => {
        const keyHookName = 'webhook-' + item.id;
        if (this.store.arrWebhook[keyHookName] || !item.hl_exts_queues) return;
        const queues: string[] = [],
          extensions: string[] = [],
          did: string[] = [];
        const hlExtsQueues = item.hl_exts_queues.split('$$');
        hlExtsQueues.forEach((hlInfo: any) => {
          const parts = hlInfo.split('##');
          const extTmp = parts[0].split(',');
          extTmp.forEach((ext: string) => {
            if (extensions.indexOf(ext) === -1 && ext.length < 6) extensions.push(ext);
            else if (did.indexOf(ext) === -1 && ext.length > 7) did.push(ext);
            if (item.config != null) this.store.arrToken = this.store.arrToken || {};
          });
          const queueTmp = parts[1].split(',');
          queueTmp.forEach((q: string) => {
            if (queues.indexOf(q) === -1) queues.push(q);
          });
        });

        if (item.did) {
          item.did.split(',').forEach((e: string) => {
            if (e.length > 7) did.push(e);
          });
        }
        if (getRuntimeConfig().logEnabled) this.logger.log(`extensions ${extensions.length}`);
        item.did = did;
        item.extensions = extensions;
        item.queues = queues;
        item.webhook_info = item.webhook_info && item.webhook_info !== 'null' ? JSON.parse(item.webhook_info) : {};
        item.webhook_external = item.webhook_external && item.webhook_external !== 'null' ? JSON.parse(item.webhook_external) : {};
        item.webhook_url = item.webhook_url ? JSON.parse(item.webhook_url) : {};
        item.webhook_type = item.webhook_type && item.webhook_type !== 'null' ? JSON.parse(item.webhook_type) : {};
        this.store.arrWebhook[keyHookName] = item;
      });
      if (getRuntimeConfig().logEnabled) this.logger.log(`[Webhook] Loaded ${Object.keys(this.store.arrWebhook).length} webhooks`);
    } catch (err: any) {
      this.logger.error(`[Webhook] Error loading webhook info: ${err.message}`);
    }
  }

  checkPostRequest(params: any): boolean {
    let flag = false;
    let webhook_select: any = false;
    for (const e in this.store.arrWebhook) {
      if (this.store.arrWebhook[e]['extensions'].indexOf(params.value.extension) > -1) {
        webhook_select = this.store.arrWebhook[e];
        break;
      }
    }
    if (!webhook_select) return false;
    if (webhook_select['webhook_type']['callcenter'] === 'default') {
      if (webhook_select['webhook_info'].hasOwnProperty(params.object)) {
        let type = '';
        if (['ringing', 'hangup', 'answered', 'completed', 'misscall'].indexOf(params.event) > -1) {
          if (params.value.calltype === 'InboundExtension') type = params.event + '_in';
          else if (params.value.calltype === 'OutboundExtension') type = params.event + '_out';
        } else if (params.event === 'AgentStatus') type = 'extstatus';
        if (webhook_select['webhook_info'][params.object].indexOf(type) > -1) flag = true;
        if (params.event === 'dialerror') flag = true;
      }
    }
    return flag;
  }

  private _buildOpts(url: string, params: any) {
    return {
      method: 'POST',
      url,
      body: JSON.stringify(params),
      headers: { 'content-type': 'application/json' },
    };
  }

  sendPostRequestv2(url: string = '', params: any) {
    if (!this.checkPostRequest(params)) return;

    params.value.connector_server = this.CONNECTOR_SERVER;

    if (params.event !== 'AgentStatus') {
      if ((params.value.fromnumber && params.value.tonumber && params.value.fromnumber.length >= 5) || params.value.tonumber.length >= 5) {
        if (typeof params.value.groupid !== 'undefined' && params.value.groupid === '710') {
          const opts710 = this._buildOpts(url, params);
          opts710.url = 'https://social-zoho-socket.micxm.vn/webhooksEventCall';
          request(opts710, this._logHandler(opts710.url));
        }
        if (getRuntimeConfig().logEnabled) this.logger.log(`--- ${params.event} : ${getTimeFormat()} - > ${params.value.fromnumber} ${params.value.calltype} ${params.value.tonumber}`);
        const opts = this._buildOpts(url, params);
        request(opts, (err: any, res: any, body: any) => {
          if (err) {
            this.logger.error(`[SendPostV2] Error: ${JSON.stringify(err)}`);
            return;
          }
          this._cleanupAfterCall(params);
          if (getRuntimeConfig().logEnabled) this.logger.log(`[SendPostV2] Response: ${JSON.stringify(body)}`);
        });
        if (BLOCKED_URLS.indexOf(url) > -1) {
          const opts2 = this._buildOpts(FALLBACK_URL, params);
          request(opts2, (err) => {
            if (!err) this._cleanupAfterCall(params);
          });
        }
      }
    } else {
      request(this._buildOpts(url, params), (err: any, res: any, body: any) => {
        if (!err && getRuntimeConfig().logEnabled) this.logger.log(`[SendPostV2 AgentStatus] Response: ${JSON.stringify(body)}`);
      });
      if (BLOCKED_URLS.indexOf(url) > -1) {
        request(this._buildOpts(FALLBACK_URL, params), () => { });
      }
    }
  }

  async sendWebhook(url: string, params: any) {
    if (!url) return;
    const id = await this.logPending(params, url);
    const runtimeConfig = getRuntimeConfig();
    for (let attempt = 1; attempt <= runtimeConfig.maxRetry; attempt++) {
      try {
        const res = await axios.post(url, params);
        if (runtimeConfig.logEnabled) this.logger.log(`[Webhook] send success (attempt ${attempt}): ${url}`);
        const responseData = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data;
        await this.updateStatus(id, 'sent', res.status, responseData, attempt);
        return;
      } catch (err: any) {
        if (runtimeConfig.logEnabled) this.logger.log(`[Webhook] Attempt ${attempt}/${runtimeConfig.maxRetry} failed: ${url}`);
        if (attempt < runtimeConfig.maxRetry) {
          await new Promise((resolve) => setTimeout(resolve, runtimeConfig.retryDelayMs));
        } else {
          if (err.code === 'ECONNREFUSED') {
            await this.updateStatus(id, 'failed', 500, err.code, attempt);
            return;
          }
          if (err.response) {
            const errCode = err.response.status;
            let errorMessage;
            const data = err.response.data;
            if (!data) {
              errorMessage = `HTTP ${errCode}: ${err.response.statusText}`;
            } else if (typeof data === 'object') {
              errorMessage = JSON.stringify(data);
            } else if (typeof data === 'string' && data.includes('<html')) {
              errorMessage = `HTTP ${errCode}: ${err.response.statusText}`;
            } else {
              errorMessage = data;
            }
            await this.updateStatus(id, 'failed', errCode, errorMessage, attempt);
            return;
          }
          await this.updateStatus(id, 'failed', 500, err.message || 'Unknown error', attempt);
        }
      }
    }
  }

  private _logHandler(url: string) {
    return (err: any, res: any, body: any) => {
      if (err) this.logger.error(`ERROR POST ${url} ${JSON.stringify(err)}`);
      else if (getRuntimeConfig().logEnabled) this.logger.log(`RESPONSE POST ${url} ${JSON.stringify(body)}`);
    };
  }

  private _cleanupAfterCall(params: any) {
    const id = params.value.callrefid;
    if (['completed', 'misscall'].indexOf(params.event) > -1) {
      if (this.store.arrDialState[id]) delete this.store.arrDialState[id];
      if (this.store.arrQueue[id]) delete this.store.arrQueue[id];
      if (this.store.flagEvent[id]) delete this.store.flagEvent[id];
    }
  }

  sendGetRequest(url: string, method: string = 'GET') {
    if (method === 'GET') {
      if (getRuntimeConfig().logEnabled) this.logger.log(`*** ${getTimeFormat()} | ${url}`);
      request.get(url, (err: any, res: any, body: any) => {
        if (err) this.logger.error(`Error ${err}`);
        else {
          if (getRuntimeConfig().logEnabled) this.logger.log(`[SendGetRequest] Response: ${JSON.stringify(body)}`);
        }
      });
    }
  }

  pushCallLog(webhook_select: any, uniqueid: string) {
    if (!this.store.arrCompleteCall[uniqueid]) return;
    const data = this.store.arrCompleteCall[uniqueid],
      calltype = 'calllog';
    const url = webhook_select['webhook_external']['callcenter'][calltype]['link'];
    const config = webhook_select['webhook_external']['callcenter']['config'];
    const method = webhook_select['webhook_external']['callcenter'][calltype]['method'];
    if (method !== 'GET') return;

    const option: string[] = [];
    let fullUrl = url + '?';
    Object.keys(config).forEach((e) => {
      if (config[e]['in'].indexOf(calltype) > -1) {
        switch (e) {
          case 'callid':
            option.push(config[e].alias + '=' + uniqueid);
            break;
          case 'duration':
            option.push(config[e].alias + '=' + data.duration);
            break;
          case 'status':
            option.push(config[e].alias + '=' + data.disposition.replace(' ', '_'));
            break;
          case 'calldate':
            option.push(config[e].alias + '=' + data.starttime.trim().replace(' ', '-'));
            break;
          case 'extension':
            option.push(config[e].alias + '=' + (this.store.arrDialState[uniqueid] || {}).extension);
            break;
          case 'phone': {
            const stateInfo = this.store.arrDialState[uniqueid] || {} as any;
            const phoneVal = stateInfo.calltype === 'Inbound' ? stateInfo.fromnumber : stateInfo.tonumber;
            option.push(config[e].alias + '=' + (phoneVal || ''));
            break;
          }
          case 'recordingfile': {
            let recFile = '';
            if (data.disposition.toLowerCase() === 'answered' && this.store.arrRecordingFile[uniqueid]) {
              recFile = this.store.arrRecordingFile[uniqueid].recordingfile.substr(1);
              const recording_url = (this.store.arrDialState[uniqueid] || {}).recordingurl + 'cvf.php?f=';
              recFile = recording_url + encodeDataToBase(recFile);
            }
            option.push(config[e].alias + '=' + recFile);
            break;
          }
          case 'secret':
            option.push(config[e].alias + '=' + config[e].value);
            break;
        }
      }
    });
    fullUrl += option.join('&');
    if (fullUrl) this.sendGetRequest(fullUrl, 'GET');
  }

  makeCallError(data: any) {
    const ext = data.extension;
    let webhook_select: any = null;
    for (const e in this.store.arrWebhook) {
      if (this.store.arrWebhook[e]['extensions'].indexOf(ext) > -1) {
        webhook_select = this.store.arrWebhook[e];
        break;
      }
    }
    if (!webhook_select) return;
    const params = {
      object: 'call',
      event: 'dialerror',
      value: {
        status: data.code,
        code: data.code,
        message: data.message,
        extension: ext,
        calltype: 'OutboundExtension',
        calldate: getTimeFormat(),
        fromnumber: ext,
        tonumber: data.phone,
      },
    };
    this.sendPostRequestv2(webhook_select['webhook_url']['callcenter'], params);
    delete this.store.arrCallError[data.linkedid];
  }

  async retryWebhook(id: number) {
    const sqlFile = `SELECT * FROM mi_webhook_log WHERE id = ? LIMIT 1`;
    const logs = await this.query(sqlFile, [id]);
    const log = logs && logs.length > 0 ? logs[0] : null;

    if (!log) {
      return { success: false, error: { code: 'LOG_NOT_FOUND', message: 'Không tìm thấy webhook log' } };
    }
    if (log.status !== 'failed') {
      return { success: false, error: { code: 'LOG_NOT_FAILED', message: 'Chỉ retry được log có status failed' } };
    }
    let params;
    try {
      params = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
    } catch {
      return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Payload trong DB không hợp lệ' } };
    }

    const url = log.webhook_url;

    try {
      const res = await axios.post(url, params, { timeout: getRuntimeConfig().setTimeoutMs });
      const responseData = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data;
      if (getRuntimeConfig().logEnabled) this.logger.log(`[Webhook] Retry success id=${id}: ${url}`);
      await this.updateRetriveStatus(id, 'sent', res.status, responseData);
      return { success: true, http_status: res.status, response: responseData };
    } catch (err: any) {
      const httpStatus = err.response?.status || 500;
      let errorMessage;
      const data = err.response?.data;
      if (!data) {
        errorMessage = `HTTP ${httpStatus}`;
      } else if (typeof data === 'object') {
        errorMessage = JSON.stringify(data);
      } else if (typeof data === 'string' && data.includes('<html')) {
        errorMessage = `HTTP ${httpStatus}`;
      } else {
        errorMessage = data;
      }
      if (err.code === 'ECONNREFUSED') {
        if (getRuntimeConfig().logEnabled) this.logger.log(`[Webhook] Retry failed id=${id}: ${url} - ${err.code}`);
        await this.updateRetriveStatus(id, 'failed', httpStatus, err.code);
        return { success: false, error: { code: 'RETRY_FAILED', message: err.code, http_status: httpStatus } };
      }
      this.logger.error(`[Webhook] Retry failed id=${id}: ${url} - ${errorMessage}`);
      await this.updateRetriveStatus(id, 'failed', httpStatus, errorMessage);
      return { success: false, error: { code: 'RETRY_FAILED', message: errorMessage, http_status: httpStatus } };
    }
  }
}
