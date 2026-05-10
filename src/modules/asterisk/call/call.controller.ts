import {
  Controller, Post, Patch, Delete, Body,
  HttpCode, HttpStatus, HttpException,
} from '@nestjs/common';
import { CallService } from './call.service';
import { Click2CallDto } from './dto/click2call.dto';
import { TransferCallDto } from './dto/transfer-call.dto';
import { MuteCallDto } from './dto/mute-call.dto';
import { HangupDto } from './dto/hangup.dto';
import { HoldCallDto } from './dto/hold-call.dto';

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) { }

  /** POST /api/calls/click2call */
  @Post('click2call')
  @HttpCode(HttpStatus.OK)
  async click2call(@Body() dto: Click2CallDto) {
    try {
      const result = await this.callService.click2call(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'CLICK2CALL_FAILED', message: err.message || 'Click2call failed' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** PATCH /api/calls/transfer */
  @Patch('transfer')
  @HttpCode(HttpStatus.OK)
  async transferCall(@Body() dto: TransferCallDto) {
    try {
      const result = await this.callService.transferCall(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'TRANSFER_FAILED', message: err.message || 'Cannot transfer call' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** PATCH /api/calls/mute */
  @Patch('mute')
  @HttpCode(HttpStatus.OK)
  async muteCall(@Body() dto: MuteCallDto) {
    try {
      const result = await this.callService.muteCall(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'MUTE_FAILED', message: err.message || 'Cannot mute call' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** DELETE /api/calls/hangup */
  @Delete('hangup')
  @HttpCode(HttpStatus.OK)
  async hangupCall(@Body() dto: HangupDto) {
    try {
      const result = await this.callService.hangupCall(dto.channel);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'HANGUP_FAILED', message: err.message || 'Cannot hangup call' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** PATCH /api/calls/hold */
  @Patch('hold')
  @HttpCode(HttpStatus.OK)
  async holdCall(@Body() dto: HoldCallDto) {
    try {
      const result = await this.callService.holdCall(dto);
      return { success: true, data: result };
    } catch (err: any) {
      throw new HttpException(
        { success: false, error: { code: 'HOLD_FAILED', message: err.message || 'Cannot hold call' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
