// backend/src/features/absences/dto/filter-absence.dto.ts
import { IsOptional, IsUUID, IsEnum, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EtatAbsence } from '../../../entities/absence.entity';

export class FilterAbsenceDto {
  @IsOptional()
  @IsUUID('all')
  eleveId?: string;

  @IsOptional()
  @IsUUID('all')
  classeId?: string;

  @IsOptional()
  @IsUUID('all')
  enseignantId?: string;

  @IsOptional()
  @IsEnum(EtatAbsence)
  etat?: EtatAbsence;

  @IsOptional()
  @IsString()
  matiere?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @IsOptional()
  @IsString()
  annee?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
