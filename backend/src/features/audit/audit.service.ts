import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: string,
    entityName: 'USER' | 'ABSENCE' | 'SEANCE' | 'CLASSE' | 'ELEVE',
    entityId: string,
    changedById: string,
    changes: any = {},
  ) {
    try {
      const auditLog = this.auditLogRepository.create({
        action,
        entityName,
        entityId,
        changedById,
        changes,
      });
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      console.error('Failed to save audit log', error);
    }
  }

  async findAll() {
    return this.auditLogRepository.find({
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
