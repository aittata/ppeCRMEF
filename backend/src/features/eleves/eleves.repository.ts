// backend/src/features/eleves/eleves.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository, Brackets } from 'typeorm';
import { Eleve } from '../../entities/eleve.entity';
import { FilterEleveDto } from './dto/filter-eleve.dto';
import { Absence } from '../../entities/absence.entity';

@Injectable()
export class ElevesRepository extends Repository<Eleve> {
  constructor(@Inject(DataSource) private dataSource: DataSource) {
    super(Eleve, dataSource.createEntityManager());
  }

  async findWithFilters(filters: FilterEleveDto, enseignantId?: string, parentId?: string): Promise<{ data: Eleve[], total: number }> {
    const qb = this.createQueryBuilder('eleve')
      .leftJoinAndSelect('eleve.classe', 'classe')
      .leftJoinAndSelect('eleve.parent', 'parent');

    if (enseignantId) {
      qb.innerJoin('classe.seances', 'seance', 'seance.enseignantId = :enseignantId', { enseignantId });
    }

    if (parentId) {
      qb.andWhere('eleve.parentId = :parentId', { parentId });
    }

    if (filters.classeId) {
      if (filters.classeId === 'none' || filters.classeId === 'null') {
        qb.andWhere('eleve.classeId IS NULL');
      } else {
        qb.andWhere('eleve.classeId = :classeId', { classeId: filters.classeId });
      }
    }

    if (filters.actif !== undefined) {
      const isActif = filters.actif === true || (filters.actif as unknown as string) === 'true';
      qb.andWhere('eleve.actif = :actif', { actif: isActif });
    }

    if (filters.search) {
      const searchStr = `%${filters.search}%`;
      qb.andWhere(
        new Brackets(sqb => {
          sqb.where('LOWER(eleve.nom) LIKE LOWER(:search)', { search: searchStr })
             .orWhere('LOWER(eleve.prenom) LIKE LOWER(:search)', { search: searchStr })
             .orWhere('LOWER(eleve.codeMassar) LIKE LOWER(:search)', { search: searchStr });
        }),
      );
    }

    const page = filters.page || 1;
    const limit = filters.limit || 100;
    qb.skip((page - 1) * limit);
    qb.take(limit);

    qb.orderBy('eleve.nom', 'ASC');
    qb.addOrderBy('eleve.prenom', 'ASC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<Eleve | null> {
    return this.createQueryBuilder('eleve')
      .leftJoinAndSelect('eleve.classe', 'classe')
      .where('eleve.id = :id', { id })
      .getOne();
  }

  async findByClasse(classeId: string, actifOnly?: boolean): Promise<Eleve[]> {
    const qb = this.createQueryBuilder('eleve')
      .where('eleve.classeId = :classeId', { classeId });
    if (actifOnly) {
      qb.andWhere('eleve.actif = :actif', { actif: true });
    }
    return qb.getMany();
  }

  async checkCodeMassar(codeMassar: string, excludeId?: string): Promise<boolean> {
    const qb = this.createQueryBuilder('eleve')
      .where('eleve.codeMassar = :codeMassar', { codeMassar });
    if (excludeId) {
      qb.andWhere('eleve.id != :excludeId', { excludeId });
    }
    return (await qb.getCount()) > 0;
  }

  async findByParent(parentId: string): Promise<Eleve[]> {
    return this.createQueryBuilder('eleve')
      .leftJoinAndSelect('eleve.classe', 'classe')
      .where('eleve.parentId = :parentId', { parentId })
      .orderBy('eleve.nom', 'ASC')
      .addOrderBy('eleve.prenom', 'ASC')
      .getMany();
  }

  async getStats(eleveId: string) {
    const absences = await this.dataSource.getRepository(Absence)
      .createQueryBuilder('a')
      .where('a.eleveId = :eleveId', { eleveId })
      .getMany();
      
    return {
      totalAbsences: absences.length,
      absencesEnAttente: absences.filter(a => a.etat === 'EN_ATTENTE').length,
    };
  }
}
