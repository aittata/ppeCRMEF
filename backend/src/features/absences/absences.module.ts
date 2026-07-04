// backend/src/features/absences/absences.module.ts
import { Module } from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { AbsencesController } from './absences.controller';
import { AbsencesRepository } from './absences.repository';
import { SeancesModule } from '../seances/seances.module';
import { ElevesModule } from '../eleves/eleves.module';
import { ExportModule } from '../export/export.module';

@Module({
  imports: [SeancesModule, ElevesModule, ExportModule],
  controllers: [AbsencesController],
  providers: [AbsencesService, AbsencesRepository],
  exports: [AbsencesService],
})
export class AbsencesModule {}
