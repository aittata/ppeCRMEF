// backend/src/entities/eleve.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { Classe } from './classe.entity';
import { Absence } from './absence.entity';
import { User } from './user.entity';

@Entity('eleves')
@Index(['classeId'])
@Index(['actif'])
export class Eleve {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  nom!: string;

  @Column({ type: 'varchar' })
  prenom!: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  codeMassar!: string;

  @Column({ type: 'date' })
  birthDate!: Date;

  @Column({ type: 'uuid', nullable: true })
  classeId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ type: 'boolean', default: true })
  actif!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Classe, classe => classe.eleves, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classeId' })
  classe?: Classe;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: User;

  @OneToMany(() => Absence, absence => absence.eleve)
  absences!: Absence[];
}
