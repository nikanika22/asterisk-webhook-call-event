import { Injectable, Logger } from '@nestjs/common';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { AddBlacklistDto } from './dto/add-blacklist.dto';
import { RemoveBlacklistDto } from './dto/remove-blacklist.dto';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(private readonly asterisk: AsteriskService) {}

  private get ami() {
    return this.asterisk.getAmi();
  }

  addBlacklist(dto: AddBlacklistDto): { code: number; message: string } {
    const data = dto.data;
    if (!data || data.length === 0) return { code: 400, message: 'data is required' };
    for (let i = 0; i < data.length; i++) {
      const { caller, reason } = data[i];
      this.ami.action(
        { action: 'command', command: `database put blacklist ${caller} "${reason}"` },
        (err: any, rq: any) => {
          if (err || rq.response === 'Error')
            this.logger.error(`Error add ${caller} into Blacklist`);
          else
            this.logger.log(`Success add ${caller} into Blacklist`);
        },
      );
    }
    return { code: 200, message: 'add black list success' };
  }

  removeBlacklist(dto: RemoveBlacklistDto): { code: number; message: string } {
    const data = dto.data;
    if (!data || data.length === 0) return { code: 400, message: 'data is required' };
    for (let i = 0; i < data.length; i++) {
      const { caller } = data[i];
      this.ami.action(
        { action: 'command', command: `database del blacklist ${caller}` },
        (err: any, rq: any) => {
          if (err || rq.response === 'Error')
            this.logger.error(`Error remove ${caller} from Blacklist`);
          else
            this.logger.log(`Success remove ${caller} from Blacklist`);
        },
      );
    }
    return { code: 200, message: 'remove black list success' };
  }
}
