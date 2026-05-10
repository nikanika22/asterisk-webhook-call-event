import {
  Controller, Get, Post, Body, HttpCode, HttpStatus, HttpException,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { RestartWebhookDto, RetryWebhookDto } from './dto/webhook.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /** POST /api/webhooks/restart */
  @Post('restart')
  @HttpCode(HttpStatus.OK)
  async restartWebhook(@Body() dto: RestartWebhookDto) {
    try {
      const { secret } = dto;
      const rows = await this.webhookService.getGroupById(secret);
      if (!rows || rows.length === 0) {
        return { success: false, error: { code: 'WEBHOOK_INVALID_SECRET', message: 'secret not valid' } };
      }
      this.webhookService.getWebhookInfo();
      return { success: true, message: 'reload success' };
    } catch (err: any) {
      return { success: false, error: { code: 'DATABASE_ERROR', message: 'DB validation failed', details: err.message } };
    }
  }

  /** POST /api/webhooks/retry */
  @Post('retry')
  @HttpCode(HttpStatus.OK)
  async retryWebhook(@Body() dto: RetryWebhookDto) {
    try {
      const result = await this.webhookService.retryWebhook(dto.id);
      if (!result.success) {
        if (result.error.code === 'RETRY_FAILED') {
          throw new HttpException(result, HttpStatus.OK);
        }
        const statusCode = result.error.code === 'LOG_NOT_FOUND' ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        throw new HttpException(result, statusCode);
      }
      return result;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Lỗi server' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** GET /api/webhooks/logs */
  @Get('logs')
  async getAllLog() {
    try {
      const result = await this.webhookService.getAllLog();
      return { success: true, data: result };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'GET_ALL_LOG_FAILED', message: err.message || 'Get all log failed', details: err },
      };
    }
  }
}
