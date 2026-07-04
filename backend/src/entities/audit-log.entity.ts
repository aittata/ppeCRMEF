// backend/src/entities/audit-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityName: string;

  @Column('uuid')
  entityId: string;

  @Column()
  action: string;

  @Column('simple-json')
  changes: any;

  @Column('uuid', { nullable: true })
  changedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changedById' })
  changedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
