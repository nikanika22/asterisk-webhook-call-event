import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { loadAmiConfigs, AmiConnectionConfig } from '../config/ami-config';
import { getRuntimeConfig } from '../config/runtime-config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AsteriskManager = require('asterisk-manager');

const ALLOWED_EVENTS = new Set([
  'dialbegin',
  'dialstate',
  'hangup',
  'cdr',
  'dialend',
]);


/**
 * AmiConnectionManager — manages N independent AMI connections (one per PBX).
 *
 * Decision: holds Map<pbxId, amiInstance>, exposes:
 *  - onAll(event, handler) — subscribe across all PBXes, handler receives pbxId
 *  - action(pbxId, payload) — send AMI action to a specific PBX
 *  - getIds() — list of active pbxId strings
 */
@Injectable()
export class AmiConnectionManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(AmiConnectionManager.name);
  private readonly connections = new Map<string, any>();

  onApplicationBootstrap() {
    const configs = loadAmiConfigs();
    for (const config of configs) {
      this.initConnection(config);
    }
  }

  private initConnection(config: AmiConnectionConfig) {
    const { pbxId, host, port, user, pass } = config;
    const ami = new AsteriskManager(port, host, user, pass, true);

    ami.keepConnected();

    ami.on('error', (err: any) => {
      this.logger.error(`[AMI:${pbxId}] Connection error: ${err.message}`);
    });

    ami.on('close', () => {
      this.logger.warn(`[AMI:${pbxId}] Connection closed — will reconnect...`);
    });

    ami.on('connect', () => {
      this.logger.log(`[AMI:${pbxId}] Connected to ${host}:${port}`);
      ami.action({ action: 'Events', eventmask: 'all' }, (err: any, res: any) => {
        if (err) return this.logger.error(`[AMI:${pbxId}] Failed to subscribe events:`, err);
        this.logger.log(`[AMI:${pbxId}] Event subscription: ${res && res.response}`);
      });
    });

    ami.on('managerevent', (evt: any) => {
      const eventName = (evt.event || '').toLowerCase();
      // Chỉ in log chi tiết cho các event quan trọng (giữ nguyên logic cũ)
      if (ALLOWED_EVENTS.has(eventName) && getRuntimeConfig().logEnabled) {
        this.logger.debug(`[AMI:${pbxId}] managerevent: ${eventName}`);
        this.logger.debug(JSON.stringify(evt, null, 2));
      }
    });

    this.connections.set(pbxId, ami);
    this.logger.log(`[AMI:${pbxId}] Initialized (${host}:${port})`);
  }

  /**
   * Register a listener for `event` across ALL PBX connections.
   * The handler receives the event data and the pbxId it came from.
   */
  onAll(event: string, handler: (data: any, pbxId: string) => void): void {
    for (const [pbxId, ami] of this.connections) {
      ami.on(event, (data: any) => handler(data, pbxId));
    }
  }

  /**
   * Send an AMI action to a specific PBX by pbxId.
   * Throws if the pbxId is not registered.
   */
  action(pbxId: string, payload: object): Promise<any> {
    const ami = this.connections.get(pbxId);
    if (!ami) {
      return Promise.reject(new Error(`[AmiConnectionManager] No AMI connection found for pbxId="${pbxId}"`));
    }
    return new Promise((resolve, reject) => {
      ami.action(payload, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Returns the list of pbxId strings currently managed.
   */
  getIds(): string[] {
    return [...this.connections.keys()];
  }
}
