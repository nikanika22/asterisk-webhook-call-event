import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { ConfigService } from '@nestjs/config';

// ─── Constants (giữ nguyên từ asteriskService.js) ────────────────────────────
const INTERNAL_CONTEXTS = ['from-internal', 'from-extensions'];
const OUTBOUND_CONTEXTS = ['trunk-dial-with-exten', 'from-internal-to-trunk'];
const INBOUND_CONTEXTS = ['from-pstn', 'from-trunk', 'from-mas'];

const ALLOWED_EVENTS = new Set([
  'dialbegin',
  'dialstate',
  'hangup',
  'cdr',
  'dialend',
  // 'extensionstatus',
]);

/**
 * AsteriskService — migrate từ asteriskService.js
 *
 * - Extend EventEmitter (giống bản gốc class AMIEventBus)
 * - Implement OnApplicationBootstrap → startAMI() sau khi server sẵn sàng
 * - Expose ami instance để các service khác gọi ami.action()
 * - AMI event listeners thuần túy (dialbegin, dialend, hangup, cdr, dialstate)
 *   được đăng ký tại đây; logic nghiệp vụ (backupState, makeCallEventv2...)
 *   sẽ được thực hiện bởi CallEventService inject vào sau.
 */
@Injectable()
export class AsteriskService extends EventEmitter implements OnApplicationBootstrap {
  private readonly logger = new Logger(AsteriskService.name);
  private isStarted = false;
  private ami: any;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  onApplicationBootstrap() {
    this.startAMI();
  }

  startAMI() {
    if (this.isStarted) return;
    this.isStarted = true;

    const amiHost = this.configService.get<string>('AMI_HOST')!;
    const amiPort = this.configService.get<number>('AMI_PORT')!;
    const amiUser = this.configService.get<string>('AMI_USER')!;
    const amiPass = this.configService.get<string>('AMI_PASS')!;

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

    // Tất cả events từ PBX đi qua đây, lọc bởi ALLOWED_EVENTS rồi emit lên bus
    this.ami.on('managerevent', (evt: any) => {
      const eventName = (evt.event || '').toLowerCase();

      // Emit raw managerevent để các service khác có thể lắng nghe nếu cần
      this.emit('managerevent', evt);

      if (!ALLOWED_EVENTS.has(eventName)) return;

      this.logger.debug(`[AMI] managerevent: ${eventName}`);
      console.log(evt);
      this.emit(eventName, evt);
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
