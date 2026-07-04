// backend/src/entities/absence.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Eleve } from './eleve.entity';
import { Classe } from './classe.entity';
import { User } from './user.entity';
import { Seance } from './seance.entity';

export enum EtatAbsence {
  EN_ATTENTE = 'EN_ATTENTE',
  JUSTIFIEE = 'JUSTIFIEE',
  NON_JUSTIFIEE = 'NON_JUSTIFIEE'
}

@Entity('absences')
@Index(['eleveId'])
@Index(['classeId'])
@Index(['date'])
@Index(['etat'])
@Index(['saisieParId'])
export class Absence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  eleveId!: string;

  @Column({ type: 'uuid' })
  classeId!: string;

  @Column({ type: 'uuid' })
  saisieParId!: string;

  @Column({ type: 'uuid', nullable: true })
  seanceId!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar' })
  heureDebut!: string;

  @Column({ type: 'varchar' })
  heureFin!: string;

  @Column({ type: 'varchar' })
  matiere!: string;

  @Column({ type: 'varchar', default: EtatAbsence.EN_ATTENTE })
  etat!: EtatAbsence;

  @Column({ type: 'varchar', nullable: true })
  motif!: string;

  @Column({ type: 'uuid', nullable: true })
  modifieeParId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Eleve, eleve => eleve.absences)
  @JoinColumn({ name: 'eleveId' })
  eleve!: Eleve;

  @ManyToOne(() => Classe, classe => classe.absences)
  @JoinColumn({ name: 'classeId' })
  classe!: Classe;

  @ManyToOne(() => User, user => user.absencesSaisies)
  @JoinColumn({ name: 'saisieParId' })
  saisiePar!: User;

  @ManyToOne(() => Seance, seance => seance.absences, { nullable: true })
  @JoinColumn({ name: 'seanceId' })
  seance!: Seance;
}
