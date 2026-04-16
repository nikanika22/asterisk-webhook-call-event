import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BlacklistRemoveItem {
  caller!: string;
}

export class RemoveBlacklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlacklistRemoveItem)
  data!: BlacklistRemoveItem[];
}
