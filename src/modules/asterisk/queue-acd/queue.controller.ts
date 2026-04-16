import {
  Controller, Get, Post, Delete, Patch,
  Body, Query, HttpCode, HttpStatus, HttpException,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { AddMemberDto } from './dto/add-member.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { PauseAgentDto } from './dto/pause-agent.dto';

@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) { }

  /** POST /api/queues/members — thêm agent vào queue */
  @Post('members')
  @HttpCode(HttpStatus.OK)
  async addMember(@Body() dto: AddMemberDto) {
    try {
      const result = await this.queueService.addMember(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'QUEUE_ADD_FAILED', message: err.message || 'Cannot add member to queue' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** DELETE /api/queues/members — xóa agent khỏi queue */
  @Delete('members')
  @HttpCode(HttpStatus.OK)
  async removeMember(@Body() dto: RemoveMemberDto) {
    try {
      const result = await this.queueService.removeMember(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'QUEUE_REMOVE_FAILED', message: err.message || 'Cannot remove member from queue' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** PATCH /api/queues/agents/pause — pause/unpause agent */
  @Patch('agents/pause')
  @HttpCode(HttpStatus.OK)
  async pauseAgent(@Body() dto: PauseAgentDto) {
    try {
      const result = await this.queueService.pauseMember(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'QUEUE_PAUSE_FAILED', message: err.message || 'Cannot pause agent' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** GET /api/queues/status?queue=1000,2000 */
  @Get('status')
  async getQueueStatus(@Query('queue') queue: string) {
    if (!queue) {
      throw new HttpException(
        { success: false, error: { code: 'INVALID_PARAMETERS', message: 'query param "queue" is required' } },
        HttpStatus.BAD_REQUEST,
      );
    }
    const queues = queue.split(',');
    const result = await this.queueService.queueStatus(queues);
    return { success: true, data: result };
  }

  /** GET /api/queues/extensions?queue=1000&id=5&secret=abc */
  @Get('extensions')
  async getExtensionInQueue(
    @Query('queue') queue: string,
    @Query('id') id?: string,
    @Query('secret') secret?: string,
  ) {
    if (!queue || (!id && !secret)) {
      throw new HttpException(
        { success: false, error: { code: 'INVALID_PARAMETERS', message: 'query params "queue" and ("id" or "secret") are required' } },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const result = await this.queueService.getExtensionInQueue(queue, id, secret);
      return { success: true, data: result.arr, meta: { names: result.arrname } };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'GET_EXTENSION_FAILED', message: err.message || 'Failed to get extensions' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
