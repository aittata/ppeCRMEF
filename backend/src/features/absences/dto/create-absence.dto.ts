// backend/src/features/absences/dto/create-absence.dto.ts
import { IsUUID, IsString, IsOptional, Matches, MaxLength, IsDateString } from 'class-validator';

export class CreateAbsenceDto {
  @IsUUID('all')
  eleveId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID('all')
  seanceId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Le format doit être HH:MM' })
  heureDebut?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Le format doit être HH:MM' })
  heureFin?: string;

  @IsOptional()
  @IsString()
  matiere?: string;

  @IsOptional()
  @IsUUID('all')
  classeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;
}
