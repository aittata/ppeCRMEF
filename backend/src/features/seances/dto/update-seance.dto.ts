// backend/src/features/seances/dto/update-seance.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSeanceDto } from './create-seance.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSeanceDto extends PartialType(CreateSeanceDto) {
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}
