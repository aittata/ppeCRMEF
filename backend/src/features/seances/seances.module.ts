// backend/src/features/seances/seances.module.ts
import { Module } from '@nestjs/common';
import { SeancesService } from './seances.service';
import { SeancesController } from './seances.controller';
import { SeancesRepository } from './seances.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seance } from '../../entities/seance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seance])],
  controllers: [SeancesController],
  providers: [SeancesService, SeancesRepository],
  exports: [SeancesService, SeancesRepository],
})
export class SeancesModule {}
