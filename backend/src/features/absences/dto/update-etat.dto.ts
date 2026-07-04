// backend/src/features/absences/dto/update-etat.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength, IsNotIn, IsArray } from 'class-validator';
import { EtatAbsence } from '../../../entities/absence.entity';

export class UpdateEtatDto {
  @IsEnum(EtatAbsence)
  @IsNotIn([EtatAbsence.EN_ATTENTE], { message: 'Impossible de revenir à EN_ATTENTE' })
  etat!: Exclude<EtatAbsence, 'EN_ATTENTE'>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;
}

export class BulkUpdateEtatDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(EtatAbsence)
  @IsNotIn([EtatAbsence.EN_ATTENTE], { message: 'Impossible de revenir à EN_ATTENTE' })
  etat!: Exclude<EtatAbsence, 'EN_ATTENTE'>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;
}

