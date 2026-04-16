import { Controller, Post, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { BlacklistService } from './blacklist.service';
import { AddBlacklistDto } from './dto/add-blacklist.dto';
import { RemoveBlacklistDto } from './dto/remove-blacklist.dto';

@Controller('blacklists')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  /** POST /api/blacklists */
  @Post()
  @HttpCode(HttpStatus.OK)
  addBlacklist(@Body() dto: AddBlacklistDto) {
    const result = this.blacklistService.addBlacklist(dto);
    return { success: result.code === 200, data: result };
  }

  /** DELETE /api/blacklists */
  @Delete()
  @HttpCode(HttpStatus.OK)
  removeBlacklist(@Body() dto: RemoveBlacklistDto) {
    const result = this.blacklistService.removeBlacklist(dto);
    return { success: result.code === 200, data: result };
  }
}
