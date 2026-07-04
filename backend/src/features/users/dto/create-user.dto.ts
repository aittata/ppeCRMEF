// backend/src/features/users/dto/create-user.dto.ts
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Matches, IsEnum, IsArray } from 'class-validator';
import { Role } from '../../../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username: lettres, chiffres, _ et - uniquement' })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(15)
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'CIN: lettres et chiffres uniquement' })
  cin!: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  contact?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  prenom!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'Le mot de passe doit être fort (minuscule, majuscule, et chiffre/caractère spécial)' })
  password!: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  matiere?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  poste?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eleveIds?: string[];
}
