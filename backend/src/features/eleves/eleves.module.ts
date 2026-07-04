// backend/src/features/eleves/eleves.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Eleve } from '../../entities/eleve.entity';
import { ElevesController } from './eleves.controller';
import { ElevesService } from './eleves.service';
import { ElevesRepository } from './eleves.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Eleve])],
  controllers: [ElevesController],
  providers: [ElevesService, ElevesRepository],
  exports: [ElevesService, ElevesRepository],
})
export class ElevesModule {}
