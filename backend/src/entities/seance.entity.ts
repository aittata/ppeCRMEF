// backend/src/entities/seance.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Unique, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Classe } from './classe.entity';
import { Absence } from './absence.entity';

export enum JourSemaine {
  LUNDI = 'LUNDI',
  MARDI = 'MARDI',
  MERCREDI = 'MERCREDI',
  JEUDI = 'JEUDI',
  VENDREDI = 'VENDREDI',
  SAMEDI = 'SAMEDI'
}

@Entity('seances')
@Index(['enseignantId'])
@Index(['classeId'])
@Index(['jourSemaine'])
export class Seance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  enseignantId!: string;

  @Column({ type: 'uuid' })
  classeId!: string;

  @Column({ type: 'varchar' })
  matiere!: string;

  @Column({ type: 'varchar' })
  jourSemaine!: JourSemaine;

  @Column({ type: 'varchar' })
  heureDebut!: string;

  @Column({ type: 'varchar' })
  heureFin!: string;

  @Column({ type: 'int', nullable: true })
  salle!: number;

  @Column({ type: 'boolean', default: true })
  actif!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.seances)
  @JoinColumn({ name: 'enseignantId' })
  enseignant!: User;

  @ManyToOne(() => Classe, classe => classe.seances)
  @JoinColumn({ name: 'classeId' })
  classe!: Classe;

  @OneToMany(() => Absence, absence => absence.seance)
  absences!: Absence[];
}
