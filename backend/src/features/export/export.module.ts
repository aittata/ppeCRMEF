// backend/src/features/export/export.module.ts
import { Module } from '@nestjs/common';
import { ExportService } from './export.service';

@Module({
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
