// backend/src/features/eleves/dto/create-eleve.dto.ts
import { IsNotEmpty, IsString, IsBoolean, IsOptional, Matches } from 'class-validator';

export class CreateEleveDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsString()
  @IsNotEmpty()
  prenom!: string;

  @IsString()
  @IsNotEmpty()
  codeMassar!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format: YYYY-MM-DD' })
  birthDate!: string;

  @IsString()
  @IsOptional()
  classeId?: string | null;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}
