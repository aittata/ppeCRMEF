// backend/src/features/seances/dto/create-seance.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsEnum, IsUUID, Matches, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { JourSemaine } from '../../../entities/seance.entity';

export class CreateSeanceDto {
  @IsUUID('all')
  @IsNotEmpty()
  enseignantId!: string;

  @IsUUID('all')
  @IsNotEmpty()
  classeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  matiere!: string;

  @IsEnum(JourSemaine)
  @IsNotEmpty()
  jourSemaine!: JourSemaine;

  @Matches(/^\d{2}:\d{2}$/, { message: 'Format HH:MM requis' })
  @IsNotEmpty()
  heureDebut!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'Format HH:MM requis' })
  @IsNotEmpty()
  heureFin!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsNotEmpty()
  salle!: number;

  @IsBoolean()
  @IsOptional()
  forceChangeTeacher?: boolean;

  @IsBoolean()
  @IsOptional()
  keepExistingTeacher?: boolean;
}
