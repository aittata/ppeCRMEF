// backend/src/features/classes/dto/create-classe.dto.ts
import { IsNotEmpty, IsEnum, IsInt, Min, Max, Matches, IsBoolean, IsOptional } from 'class-validator';
import { NiveauClasse } from '../../../entities/classe.entity';

export class CreateClasseDto {
  @IsEnum(NiveauClasse)
  @IsNotEmpty()
  niveau!: NiveauClasse;

  @IsInt()
  @Min(1)
  @Max(99)
  @IsNotEmpty()
  numero!: number;

  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}
