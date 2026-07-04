// backend/src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Seance } from './seance.entity';
import { Absence } from './absence.entity';

export enum Role {
  ADMIN = 'ADMIN',
  CADRE_ADMINISTRATIF = 'CADRE_ADMINISTRATIF',
  ENSEIGNANT = 'ENSEIGNANT',
  PARENT = 'PARENT'
}

export const ROLES_KEY = 'roles';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  username!: string;

  @Index()
  @Column({ type: 'varchar', unique: true, nullable: true })
  cin?: string;

  @Column({ type: 'varchar', nullable: true })
  contact?: string;

  @Column({ type: 'varchar' })
  nom!: string;

  @Column({ type: 'varchar' })
  prenom!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar', nullable: true })
  refreshToken!: string;

  @Column({ type: 'varchar', default: Role.ENSEIGNANT })
  role!: Role;

  @Column({ type: 'boolean', default: true })
  actif!: boolean;

  @Column({ type: 'varchar', nullable: true })
  matiere!: string;

  @Column({ type: 'varchar', nullable: true })
  poste!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Seance, seance => seance.enseignant)
  seances!: Seance[];

  @OneToMany(() => Absence, absence => absence.saisiePar)
  absencesSaisies!: Absence[];
}
