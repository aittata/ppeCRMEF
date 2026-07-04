// backend/src/features/seances/seances.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Seance, JourSemaine } from '../../entities/seance.entity';

@Injectable()
export class SeancesRepository extends Repository<Seance> {
  constructor(@Inject(DataSource) private dataSource: DataSource) {
    super(Seance, dataSource.createEntityManager());
  }

  async findByEnseignant(enseignantId: string, actifOnly: boolean = false): Promise<Seance[]> {
    const qb = this.createQueryBuilder('seance')
      .leftJoinAndSelect('seance.classe', 'classe')
      .where('seance.enseignantId = :enseignantId', { enseignantId });

    if (actifOnly) {
      qb.andWhere('seance.actif = :actif', { actif: true });
    }

    // Mapping over specific ordering could be done by creating a CASE WHEN but standard sorting by string is ok or we can just sort in memory/let the front end do it, but let's do our best
    qb.orderBy('seance.jourSemaine', 'ASC')
      .addOrderBy('seance.heureDebut', 'ASC');

    return qb.getMany();
  }

  async findByClasse(classeId: string, actifOnly: boolean = false): Promise<Seance[]> {
    const qb = this.createQueryBuilder('seance')
      .leftJoin('seance.enseignant', 'enseignant')
      .addSelect(['enseignant.id', 'enseignant.nom', 'enseignant.prenom', 'enseignant.matiere']) // Safe, sans password
      .where('seance.classeId = :classeId', { classeId });

    if (actifOnly) {
      qb.andWhere('seance.actif = :actif', { actif: true });
    }

    qb.orderBy('seance.jourSemaine', 'ASC')
      .addOrderBy('seance.heureDebut', 'ASC');

    return qb.getMany();
  }

  async findAll(filters: { enseignantId?: string; classeId?: string; matiere?: string; actif?: boolean; classeIds?: string[] } = {}): Promise<Seance[]> {
    const qb = this.createQueryBuilder('seance')
      .leftJoinAndSelect('seance.classe', 'classe')
      .leftJoin('seance.enseignant', 'enseignant')
      .addSelect(['enseignant.id', 'enseignant.nom', 'enseignant.prenom', 'enseignant.matiere']);

    if (filters.enseignantId) {
      qb.andWhere('seance.enseignantId = :enseignantId', { enseignantId: filters.enseignantId });
    }
    if (filters.classeId) {
      qb.andWhere('seance.classeId = :classeId', { classeId: filters.classeId });
    } else if (filters.classeIds) {
      if (filters.classeIds.length === 0) {
        qb.andWhere('1 = 0');
      } else {
        qb.andWhere('seance.classeId IN (:...classeIds)', { classeIds: filters.classeIds });
      }
    }
    if (filters.matiere) {
      qb.andWhere('seance.matiere ILIKE :matiere', { matiere: `%${filters.matiere}%` });
    }
    if (filters.actif !== undefined) {
      qb.andWhere('seance.actif = :actif', { actif: filters.actif });
    }

    qb.orderBy('seance.jourSemaine', 'ASC')
      .addOrderBy('seance.heureDebut', 'ASC');

    return qb.getMany();
  }

  async findById(id: string): Promise<Seance | null> {
    return this.createQueryBuilder('seance')
      .leftJoinAndSelect('seance.classe', 'classe')
      .leftJoin('seance.enseignant', 'enseignant')
      .addSelect(['enseignant.id', 'enseignant.nom', 'enseignant.prenom', 'enseignant.matiere'])
      .where('seance.id = :id', { id })
      .getOne();
  }

  async checkConflitEnseignant(enseignantId: string, jour: JourSemaine, debut: string, fin: string, excludeId?: string): Promise<Seance | null> {
    const qb = this.createQueryBuilder('seance')
      .leftJoinAndSelect('seance.classe', 'classe')
      .where('seance.enseignantId = :enseignantId', { enseignantId })
      .andWhere('seance.jourSemaine = :jour', { jour })
      .andWhere('seance.actif = :actif', { actif: true })
      .andWhere('seance.heureDebut < :fin', { fin })
      .andWhere('seance.heureFin > :debut', { debut });

    if (excludeId) {
      qb.andWhere('seance.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  async checkConflitClasse(classeId: string, jour: JourSemaine, debut: string, fin: string, excludeId?: string): Promise<Seance | null> {
    const qb = this.createQueryBuilder('seance')
      .leftJoinAndSelect('seance.classe', 'classe')
      .leftJoin('seance.enseignant', 'enseignant')
      .addSelect(['enseignant.id', 'enseignant.nom', 'enseignant.prenom', 'enseignant.matiere'])
      .where('seance.classeId = :classeId', { classeId })
      .andWhere('seance.jourSemaine = :jour', { jour })
      .andWhere('seance.actif = :actif', { actif: true })
      .andWhere('seance.heureDebut < :fin', { fin })
      .andWhere('seance.heureFin > :debut', { debut });

    if (excludeId) {
      qb.andWhere('seance.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  async checkConflitSalle(salle: number, jour: JourSemaine, debut: string, fin: string, excludeId?: string): Promise<Seance | null> {
    const qb = this.createQueryBuilder('seance')
      .where('seance.salle = :salle', { salle })
      .andWhere('seance.jourSemaine = :jour', { jour })
      .andWhere('seance.actif = :actif', { actif: true })
      .andWhere('seance.heureDebut < :fin', { fin })
      .andWhere('seance.heureFin > :debut', { debut });

    if (excludeId) {
      qb.andWhere('seance.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  async checkUniqueEnseignantMatiereClasse(classeId: string, matiere: string, excludeEnseignantId: string): Promise<Seance | null> {
    return this.createQueryBuilder('seance')
      .leftJoinAndSelect('seance.enseignant', 'enseignant')
      .where('seance.classeId = :classeId', { classeId })
      .andWhere('seance.matiere = :matiere', { matiere })
      .andWhere('seance.enseignantId != :excludeEnseignantId', { excludeEnseignantId })
      .andWhere('seance.actif = :actif', { actif: true })
      .getOne();
  }
}

