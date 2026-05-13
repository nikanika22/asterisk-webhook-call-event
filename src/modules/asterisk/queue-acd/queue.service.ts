import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'mysql';
import { DATABASE_POOL } from '../../../shared/database/database.providers';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { getTimeFormat } from '../../../shared/helpers/helpers';
import { AddMemberDto } from './dto/add-member.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { PauseAgentDto } from './dto/pause-agent.dto';
import { getRuntimeConfig } from '../../../core/config/runtime-config';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly asterisk: AsteriskService,
  ) { }

  private get ami() {
    return this.asterisk.getAmi();
  }

  private queryDb(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  }

  private async find(items: Record<string, any>, text: string): Promise<string[]> {
    return Object.keys(items).filter((item) => items[item].indexOf(text) > -1);
  }

  async addMember(dto: AddMemberDto): Promise<any> {
    const { queue, extension, penalty = 0 } = dto;
    const agentId = dto.agentId || '00' + extension;

    return new Promise((resolve, reject) => {
      this.ami.action(
        {
          action: 'QueueAdd',
          queue,
          interface: `Local/${agentId}@agentqueue/n`,
          membername: agentId,
          stateinterface: `hint:${extension}@ext-local`,
          penalty,
        },
        (err: any, rq: any) => {
          if (err) return reject(err);
          if (rq.response !== 'Success') return reject(rq);

          this.ami.action(
            {
              action: 'queuelog',
              interface: `Local/${agentId}@agentqueue/n`,
              queue,
              event: 'AGENTLOGIN',
              message: extension,
            },
            (err2: any, rq2: any) => {
              if (err2) return reject(err2);
              if (rq2.response !== 'Success') return reject(rq2);

              this.ami.action(
                { action: 'command', command: `DATABASE PUT agentqueue ${agentId} SIP/${extension}` },
                (err3: any, rq3: any) => {
                  if (err3) return reject(err3);
                  if (getRuntimeConfig().logEnabled) this.logger.log(`*** ${getTimeFormat()} | Action: Login ${agentId} - Queue ${queue}`);
                  resolve(rq3);
                },
              );
            },
          );
        },
      );
    });
  }

  async removeMember(dto: RemoveMemberDto): Promise<any> {
    const { queue, extension } = dto;
    const agentId = dto.agentId || '00' + extension;

    return new Promise((resolve, reject) => {
      this.ami.action(
        { action: 'QueueRemove', queue, interface: `Local/${agentId}@agentqueue/n` },
        async (err: any, rq: any) => {
          if (err) return reject(err);
          if (rq.response !== 'Success') return reject(rq);

          const command = { action: 'command', command: 'queue show' };
          this.ami.action(command, async (err2: any, res2: any) => {
            const arr = res2.output;
            const hint = `hint:${extension}@ext-local`;
            const check = await this.find(arr, hint);
            if (parseInt(String(check.length + 1)) <= 1) {
              this.ami.action(
                { action: 'command', command: `DATABASE DEL agentqueue ${agentId}` },
                (err3: any, rq3: any) => {
                  if (err3) return reject(err3);
                  if (getRuntimeConfig().logEnabled) this.logger.log(`*** ${getTimeFormat()} | Action: Logout ${agentId} - Queue ${queue}`);
                  resolve(rq3);
                },
              );
            } else {
              if (getRuntimeConfig().logEnabled) this.logger.log(`*** ${getTimeFormat()} | Action: Logout ${agentId} - Queue ${queue}`);
              resolve(rq);
            }
          });
        },
      );
    });
  }

  async pauseMember(dto: PauseAgentDto): Promise<any> {
    const { queue, extension, paused = false, reason } = dto;
    const agentId = dto.agentId || '00' + extension;

    const pauseAction: any = {
      Action: 'QueuePause',
      Paused: paused,
      Queue: queue,
      interface: `Local/${agentId}@agentqueue/n`,
      membername: agentId,
      stateinterface: `hint:${extension}@ext-local`,
    };
    if (reason) pauseAction.Reason = reason;

    return new Promise((resolve, reject) => {
      this.ami.action(pauseAction, (err: any, rq: any) => {
        if (err) return reject(err);
        if (rq.response !== 'Success') return reject(rq);
        if (getRuntimeConfig().logEnabled) {
          this.logger.log(
            `*** ${getTimeFormat()} | Action: Pause ${agentId} - Queue ${queue} - Reason: ${reason}`,
          );
        }
        resolve(rq);
      });
    });
  }

  async queueStatus(queues: string[]): Promise<Record<string, any>> {
    const rs: Record<string, any> = {};
    return new Promise((resolve) => {
      queues.forEach((queue) => {
        this.ami.action({ action: 'QueueStatus', queue }, (err: any, rq: any) => {
          rs[queue] = rq;
        });
      });
      setTimeout(() => resolve(rs), getRuntimeConfig().setTimeoutMs);
    });
  }

  /**
   * GET /api/queues/extensions?queue=...&id=...&secret=...
   * Tự query DB để lấy danh sách extension trong queue.
   * Không nhận dbRows từ client — chuẩn RESTful.
   */
  async getExtensionInQueue(
    queue: string,
    id?: string,
    secret?: string,
  ): Promise<{ arr: string[]; arrname: Record<string, string> }> {
    // 1. Query DB lấy hl_exts_queues
    let sql = `SELECT g.secret,
      (SELECT GROUP_CONCAT(CONCAT_WS('##', gh.extensions, gh.queues) SEPARATOR '$$')
       FROM group_hotline gh
       WHERE gh.groupId = g.id AND gh.status='publish' AND gh.queues LIKE ?) AS hl_exts_queues
      FROM groups g`;
    const params: any[] = ['%' + queue + '%'];

    if (id && id !== '1') {
      sql += ' WHERE g.id = ?';
      params.push(id);
    } else if (secret) {
      sql += ' WHERE g.secret = ?';
      params.push(secret);
    }
    sql += ' HAVING hl_exts_queues IS NOT NULL LIMIT 1';

    const rows = await this.queryDb(sql, params);
    if (!rows || rows.length === 0) return { arr: [], arrname: {} };

    // 2. Parse hl_exts_queues → list extension
    const hlExtsQueues: string[] = rows[0].hl_exts_queues.split('$$');
    const extTmp: string[] = [];
    hlExtsQueues.forEach((hlInfo: string) => {
      const parts = hlInfo.split('##');
      parts[0].split(',').forEach((e: string) => extTmp.push(e));
    });

    // 3. Lấy trạng thái queue từ AMI
    return new Promise((resolve, reject) => {
      this.ami.action({ action: 'Command', Command: `queue show ${queue}` }, (err: any, rq: any) => {
        if (err) return reject(err);
        const arr: string[] = [];
        const arrname: Record<string, string> = {};
        for (let i = 0; i < rq.output.length; i++) {
          const check = rq.output[i].match(/Local\/(.+)@from-queue/);
          const checkagentname = rq.output[i].match(/(.+)\(Local/);
          if (check != null && check.length > 1 && extTmp.indexOf(check[1]) > -1) {
            arr.push(check[1].toString());
            if (checkagentname != null && checkagentname.length > 1) {
              arrname[check[1].toString()] = checkagentname[1].trim();
            }
          }
        }
        resolve({ arr, arrname });
      });
    });
  }
}
