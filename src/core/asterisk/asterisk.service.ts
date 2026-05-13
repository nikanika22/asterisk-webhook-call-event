import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';


/**
 * AsteriskService — legacy single-instance AMI wrapper kept for backward compat.
 * Action services (CallService, QueueService, etc.) use this to send AMI commands.
 * For multi-PBX event listening, use AmiConnectionManager instead.
 *
 * Reads from AMI_HOST_01 / AMI_PORT_01 / AMI_USER_01 / AMI_PASS_01 (new naming convention).
 */
@Injectable()
export class AsteriskService extends EventEmitter implements OnApplicationBootstrap {
  private readonly logger = new Logger(AsteriskService.name);
  private isStarted = false;
  private ami: any;

  constructor() {
    super();
  }

  onApplicationBootstrap() {
    this.startAMI();
  }

  startAMI() {
    if (this.isStarted) return;
    this.isStarted = true;

    const amiHost = process.env['AMI_HOST_01']!;
    const amiPort = parseInt(process.env['AMI_PORT_01'] || '5038', 10);
    const amiUser = process.env['AMI_USER_01']!;
    const amiPass = process.env['AMI_PASS_01']!;

    if (!amiHost || !amiUser || !amiPass) {
      this.logger.error('[AMI] AsteriskService: missing AMI_HOST_01 / AMI_USER_01 / AMI_PASS_01 in env. Skipping legacy connection.');
      return;
    }

    // Dùng require() vì asterisk-manager không có type declarations tốt
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsteriskManager = require('asterisk-manager');

    this.ami = new AsteriskManager(amiPort, amiHost, amiUser, amiPass, true);

    // Auto-reconnect (giống keepConnected() trong config/asterisk.js)
    this.ami.keepConnected();

    this.ami.on('error', (err: any) => {
      this.logger.error(`[AMI] Connection error: ${err.message}`);
    });

    this.ami.on('close', () => {
      this.logger.warn('[AMI] Connection closed — will reconnect...');
    });

    // Khi kết nối TCP thành công → subscribe events và bắt đầu lắng nghe
    this.ami.on('connect', () => {
      this.logger.log(`[AMI] Connected to ${amiHost}:${amiPort}`);

      this.ami.action({ action: 'Events', eventmask: 'all' }, (err: any, res: any) => {
        if (err) return this.logger.error('[AMI] Failed to subscribe events:', err);
        this.logger.log(`[AMI] Event subscription: ${res && res.response}`);
      });
    });
  }

  /**
   * Gửi AMI action — Promise wrapper, dùng cho các service khác
   */
  action(payload: object): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ami) return reject(new Error('AMI not initialized'));
      this.ami.action(payload, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Expose ami instance raw (dùng khi cần callback-style action như trong queueService gốc)
   */
  getAmi(): any {
    return this.ami;
  }
}
