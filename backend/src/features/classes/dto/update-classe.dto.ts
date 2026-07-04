// backend/src/features/classes/dto/update-classe.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateClasseDto } from './create-classe.dto';

export class UpdateClasseDto extends PartialType(CreateClasseDto) {}
