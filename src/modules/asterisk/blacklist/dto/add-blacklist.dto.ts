import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BlacklistItem {
  caller!: string;
  reason!: string;
}

export class AddBlacklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlacklistItem)
  data!: BlacklistItem[];
}
