// backend/src/features/classes/classes.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Classe } from '../../entities/classe.entity';
import { Eleve } from '../../entities/eleve.entity';
import { Absence } from '../../entities/absence.entity';

export interface FilterClasse {
  actif?: boolean;
  niveau?: string;
}

@Injectable()
export class ClassesRepository extends Repository<Classe> {
  constructor(@Inject(DataSource) private dataSource: DataSource) {
    super(Classe, dataSource.createEntityManager());
  }

  async findAll(filters: FilterClasse = {}): Promise<Classe[]> {
    const qb = this.createQueryBuilder('classe');
    if (filters.actif !== undefined) {
      const isActif = filters.actif === true || (filters.actif as unknown as string) === 'true';
      qb.andWhere('classe.actif = :actif', { actif: isActif });
    }
    if (filters.niveau) {
      qb.andWhere('classe.niveau = :niveau', { niveau: filters.niveau });
    }
    qb.orderBy('classe.niveau', 'ASC');
    qb.addOrderBy('classe.numero', 'ASC');
    
    qb.loadRelationCountAndMap('classe.totalEleves', 'classe.eleves', 'eleves', qbEleve => qbEleve.where('eleves.actif = :actif', { actif: true }));

    return qb.getMany();
  }

  async findById(id: string): Promise<Classe | null> {
    const qb = this.createQueryBuilder('classe')
      .where('classe.id = :id', { id })
      .leftJoinAndSelect('classe.seances', 'seance')
      .loadRelationCountAndMap('classe.totalEleves', 'classe.eleves', 'eleves', qbEleve => qbEleve.where('eleves.actif = :actif', { actif: true }));
    return qb.getOne();
  }

  async findByEnseignant(enseignantId: string): Promise<Classe[]> {
    const qb = this.createQueryBuilder('classe')
      .innerJoin('classe.seances', 'seance')
      .where('seance.enseignantId = :enseignantId', { enseignantId })
      .andWhere('classe.actif = :actif', { actif: true })
      .orderBy('classe.niveau', 'ASC')
      .addOrderBy('classe.numero', 'ASC');
    return qb.getMany();
  }

  async checkDuplicate(niveau: string, numero: number, excludeId?: string): Promise<boolean> {
    const qb = this.createQueryBuilder('classe')
      .where('classe.niveau = :niveau', { niveau })
      .andWhere('classe.numero = :numero', { numero });
    
    if (excludeId) {
      qb.andWhere('classe.id != :excludeId', { excludeId });
    }
    const count = await qb.getCount();
    return count > 0;
  }

  async getStats(classeId: string) {
    const totalEleves = await this.dataSource.getRepository(Eleve)
      .createQueryBuilder('e')
      .where('e.classeId = :classeId AND e.actif = :actif', { classeId, actif: true })
      .getCount()
      .catch(() => 0);
      
    const totalAbsences = await this.dataSource.getRepository(Absence)
      .createQueryBuilder('a')
      .where('a.classeId = :classeId', { classeId })
      .getCount()
      .catch(() => 0);
      
    const absencesEnAttente = await this.dataSource.getRepository(Absence)
      .createQueryBuilder('a')
      .where('a.classeId = :classeId AND a.etat = :etat', { classeId, etat: 'EN_ATTENTE' })
      .getCount()
      .catch(() => 0);
      
    return { 
      totalEleves, 
      totalAbsences, 
      absencesEnAttente, 
      tauxAbsenteisme: 0 // Mock calculation logic
    };
  }
}
