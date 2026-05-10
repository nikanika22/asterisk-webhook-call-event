import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ExtensionService } from './extension.service';

@Controller('extensions')
export class ExtensionController {
  constructor(private readonly extensionService: ExtensionService) {}

  /** GET /api/extensions/status?extension=xxx */
  @Get('status')
  async getStatus(@Query('extension') extension: string) {
    try {
      const result = await this.extensionService.getExtensionStatus(extension);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'EXTENSION_STATUS_FAILED', message: err.message || 'Cannot get extension status' } },
        err.code === 406 ? HttpStatus.NOT_ACCEPTABLE : HttpStatus.BAD_REQUEST,
      );
    }
  }
}
