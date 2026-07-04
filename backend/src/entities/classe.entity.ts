// backend/src/entities/classe.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Unique, Index } from 'typeorm';
import { Eleve } from './eleve.entity';
import { Seance } from './seance.entity';
import { Absence } from './absence.entity';

export enum NiveauClasse {
  AC1 = '1AC',
  AC2 = '2AC',
  AC3 = '3AC'
}

@Entity('classes')
@Unique(['niveau', 'numero'])
@Index(['actif'])
export class Classe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  niveau!: NiveauClasse;

  @Column({ type: 'int' })
  numero!: number;

  @Column({ type: 'boolean', default: true })
  actif!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Eleve, eleve => eleve.classe)
  eleves!: Eleve[];

  @OneToMany(() => Seance, seance => seance.classe)
  seances!: Seance[];

  @OneToMany(() => Absence, absence => absence.classe)
  absences!: Absence[];

  get libelle(): string {
    return `${this.niveau}-${this.numero}`;
  }
}
