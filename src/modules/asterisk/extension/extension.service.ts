import { Injectable, Logger } from '@nestjs/common';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';

const ARR_EXTENSION_STATUS: Record<string, string> = {
  '-1': 'extension_not_found',
  '0':  'idle',
  '1':  'in_Use',
  '2':  'busy',
  '4':  'unavailable',
  '8':  'ringing',
  '16': 'on_hold',
};

@Injectable()
export class ExtensionService {
  private readonly logger = new Logger(ExtensionService.name);

  constructor(private readonly asterisk: AsteriskService) {}

  private get ami() {
    return this.asterisk.getAmi();
  }

  async getExtensionStatus(extension: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!extension) return reject({ code: 406, message: 'params không hợp lệ' });
      this.ami.action(
        { action: 'ExtensionState', exten: extension, context: 'ext-local' },
        (err: any, response: any) => {
          if (err || response.response === 'Error')
            return reject({ code: 400, message: 'extension error' });
          resolve({
            extension,
            status: ARR_EXTENSION_STATUS[String(response.status)],
            code: 200,
            statusNumber: response.status,
          });
        },
      );
    });
  }

  actionGetDevicePeer(peer: string): Promise<any> {
    return new Promise((resolve) => {
      this.ami.action(
        { action: 'command', command: `sip show peer ${peer}` },
        (err: any, res: any) => resolve(res),
      );
    });
  }
}
