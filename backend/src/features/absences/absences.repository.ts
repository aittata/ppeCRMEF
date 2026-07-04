// backend/src/features/absences/absences.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Absence, EtatAbsence } from '../../entities/absence.entity';
import { Eleve } from '../../entities/eleve.entity';
import { FilterAbsenceDto } from './dto/filter-absence.dto';

interface DashboardStats {
  totalAbsences: number;
  absencesAujourdHui: number;
  enAttente: number;
  justifiees: number;
  nonJustifiees: number;
  elevesEnAlerte: Array<{ eleveId: string; nom: string; prenom: string; codeMassar?: string; count: number }>;
  classesEnAlerte: Array<{ classeId: string; libelle: string; elevesEnAlerteCount: number }>;
  totalElevesActifs: number;
  elevesParNiveau: Array<{ niveau: string; count: number }>;
  totalElevesInactifs: number;
}

@Injectable()
export class AbsencesRepository extends Repository<Absence> {
  constructor(@Inject(DataSource) private dataSource: DataSource) {
    super(Absence, dataSource.createEntityManager());
  }

  private applyFilters(qb: SelectQueryBuilder<Absence>, filters: FilterAbsenceDto, saisieParId?: string, parentEleveIds?: string[]) {
    if (parentEleveIds) {
      if (parentEleveIds.length === 0) {
        qb.andWhere('1 = 0');
      } else {
        qb.andWhere('absence.eleveId IN (:...parentEleveIds)', { parentEleveIds });
      }
    }
    if (filters.eleveId) {
      qb.andWhere('absence.eleveId = :eleveId', { eleveId: filters.eleveId });
    }
    if (filters.classeId) {
      qb.andWhere('absence.classeId = :classeId', { classeId: filters.classeId });
    }
    if (filters.enseignantId) {
      // Pour retrouver l'enseignant, so on check la séance ou la personne qui a saisi.
      // D'après R4 ENSEIGNANT ne voit que SES absences. Done handled by saisieParId
      // Mais si qqn filtre par enseignantId on peut le faire sur seance.enseignantId
      qb.andWhere('seance.enseignantId = :enseignantId', { enseignantId: filters.enseignantId });
    }
    if (filters.etat) {
      qb.andWhere('absence.etat = :etat', { etat: filters.etat });
    }
    if (filters.matiere) {
      qb.andWhere('absence.matiere = :matiere', { matiere: filters.matiere });
    }
    if (filters.dateDebut) {
      qb.andWhere('absence.date >= :dateDebut', { dateDebut: filters.dateDebut });
    }
    if (filters.dateFin) {
      qb.andWhere('absence.date <= :dateFin', { dateFin: filters.dateFin });
    }
    if (filters.annee) {
      qb.andWhere('classe.annee = :annee', { annee: filters.annee });
    }
    if (filters.search) {
      qb.andWhere('(LOWER(eleve.nom) LIKE LOWER(:search) OR LOWER(eleve.prenom) LIKE LOWER(:search) OR LOWER(eleve.codeMassar) LIKE LOWER(:search))', { search: `%${filters.search}%` });
    }
    if (saisieParId) {
      qb.andWhere('absence.saisieParId = :saisieParId', { saisieParId });
    }
  }

  async findWithFilters(filters: FilterAbsenceDto, saisieParId?: string, parentEleveIds?: string[]): Promise<{ data: Absence[], total: number }> {
    const qb = this.createQueryBuilder('absence')
      .leftJoinAndSelect('absence.eleve', 'eleve')
      .leftJoinAndSelect('absence.classe', 'classe')
      .leftJoinAndSelect('absence.saisiePar', 'saisiePar')
      .leftJoinAndSelect('absence.seance', 'seance')
      .orderBy('absence.date', 'DESC')
      .addOrderBy('absence.heureDebut', 'DESC');

    this.applyFilters(qb, filters, saisieParId, parentEleveIds);

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findForExport(filters: FilterAbsenceDto, saisieParId?: string, limit: number = 5000, parentEleveIds?: string[]): Promise<Absence[]> {
    const qb = this.createQueryBuilder('absence')
      .leftJoinAndSelect('absence.eleve', 'eleve')
      .leftJoinAndSelect('absence.classe', 'classe')
      .leftJoinAndSelect('absence.saisiePar', 'saisiePar')
      .leftJoinAndSelect('absence.seance', 'seance')
      .orderBy('absence.date', 'DESC')
      .addOrderBy('absence.heureDebut', 'DESC');

    this.applyFilters(qb, filters, saisieParId, parentEleveIds);

    qb.take(limit);

    return qb.getMany();
  }

  async checkDoublon(eleveId: string, date: string, heureDebut: string, excludeId?: string): Promise<boolean> {
    const qb = this.createQueryBuilder('absence')
      .where('absence.eleveId = :eleveId', { eleveId })
      .andWhere('absence.date = :date', { date })
      .andWhere('absence.heureDebut = :heureDebut', { heureDebut });

    if (excludeId) {
      qb.andWhere('absence.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async findById(id: string): Promise<Absence | null> {
    return this.createQueryBuilder('absence')
      .leftJoinAndSelect('absence.eleve', 'eleve')
      .leftJoinAndSelect('absence.classe', 'classe')
      .leftJoinAndSelect('absence.saisiePar', 'saisiePar')
      .leftJoinAndSelect('absence.seance', 'seance')
      .where('absence.id = :id', { id })
      .getOne();
  }

  async getDashboardStats(filters?: Partial<FilterAbsenceDto>): Promise<DashboardStats> {
    const dbType = this.dataSource.options.type;
    const qbBase = () => {
      const q = this.createQueryBuilder('absence')
        .leftJoin('absence.eleve', 'eleve')
        .leftJoin('absence.classe', 'classe')
        .leftJoin('absence.seance', 'seance');
      this.applyFilters(q, filters as FilterAbsenceDto);
      return q;
    };

    const today = new Date().toISOString().split('T')[0];

    // Queries executed in parallel
    const [
      totalCount,
      todayCount,
      attenteCount,
      justifieeCount,
      nonJustifieeCount,
      absencesClasse,
      absencesMatiere,
      totalElevesActifs,
      elevesParNiveauRaw,
      totalElevesInactifs
    ] = await Promise.all([
      qbBase().getCount(),
      qbBase().andWhere('absence.date = :today', { today }).getCount(),
      qbBase().andWhere('absence.etat = :etat', { etat: EtatAbsence.EN_ATTENTE }).getCount(),
      qbBase().andWhere('absence.etat = :etat', { etat: EtatAbsence.JUSTIFIEE }).getCount(),
      qbBase().andWhere('absence.etat = :etat', { etat: EtatAbsence.NON_JUSTIFIEE }).getCount(),
      
      // Absences par classe
      qbBase()
        .select('classe.id', 'classeId')
        .addSelect('classe.niveau || \'-\' || classe.numero', 'libelle')
        .addSelect('COUNT(absence.id)', 'count')
        .groupBy('classe.id')
        .addGroupBy('classe.niveau')
        .addGroupBy('classe.numero')
        .orderBy('count', 'DESC')
        .getRawMany(),

      // Absences par matière
      qbBase()
        .select('absence.matiere', 'matiere')
        .addSelect('COUNT(absence.id)', 'count')
        .groupBy('absence.matiere')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),

      // Total élèves actifs
      this.dataSource.getRepository(Eleve).count({ where: { actif: true } }),

      // Élèves répartis par niveau
      this.dataSource.getRepository(Eleve)
        .createQueryBuilder('eleve')
        .innerJoin('eleve.classe', 'classe')
        .select('classe.niveau', 'niveau')
        .addSelect('COUNT(eleve.id)', 'count')
        .where('eleve.actif = :activo', { activo: true })
        .groupBy('classe.niveau')
        .getRawMany(),

      // Total élèves inactifs
      this.dataSource.getRepository(Eleve).count({ where: { actif: false } })
    ]);

    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const firstDayOfWeek = monday.toISOString().split('T')[0];

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const lastDayOfWeek = sunday.toISOString().split('T')[0];

    const elevesEnAlerteRaw = await qbBase()
      .select('eleve.id', 'eleveId')
      .addSelect('eleve.nom', 'nom')
      .addSelect('eleve.prenom', 'prenom')
      .addSelect('eleve.codeMassar', 'codeMassar')
      .addSelect('classe.id', 'classeId')
      .addSelect("classe.niveau || '-' || classe.numero", 'classeLibelle')
      .addSelect('COUNT(absence.id)', 'count')
      .andWhere('absence.etat = :etatAlert', { etatAlert: EtatAbsence.NON_JUSTIFIEE })
      .andWhere('absence.date >= :firstDayOfWeek', { firstDayOfWeek })
      .andWhere('absence.date <= :lastDayOfWeek', { lastDayOfWeek })
      .groupBy('eleve.id')
      .addGroupBy('eleve.nom')
      .addGroupBy('eleve.prenom')
      .addGroupBy('eleve.codeMassar')
      .addGroupBy('classe.id')
      .addGroupBy('classe.niveau')
      .addGroupBy('classe.numero')
      .having('COUNT(absence.id) > 2')
      .orderBy('count', 'DESC')
      .limit(500)
      .getRawMany();

    const classAlertCounts: Record<string, any> = {};
    for (const e of elevesEnAlerteRaw) {
      if (!classAlertCounts[e.classeId]) {
        classAlertCounts[e.classeId] = { classeId: e.classeId, libelle: e.classeLibelle, elevesEnAlerteCount: 0 };
      }
      classAlertCounts[e.classeId].elevesEnAlerteCount++;
    }
    const classesEnAlerte = Object.values(classAlertCounts).filter((c: any) => c.elevesEnAlerteCount >= 5) as any;

    const levelsMap: Record<string, number> = { '1AC': 0, '2AC': 0, '3AC': 0 };
    for (const row of elevesParNiveauRaw) {
      if (row.niveau) {
        levelsMap[row.niveau] = parseInt(row.count, 10) || 0;
      }
    }
    const elevesParNiveau = Object.entries(levelsMap).map(([niveau, count]) => ({
      niveau,
      count
    }));

    return {
      totalAbsences: totalCount,
      absencesAujourdHui: todayCount,
      enAttente: attenteCount,
      justifiees: justifieeCount,
      nonJustifiees: nonJustifieeCount,
      elevesEnAlerte: elevesEnAlerteRaw.slice(0, 50).map(e => ({
        eleveId: e.eleveId,
        nom: e.nom,
        prenom: e.prenom,
        codeMassar: e.codeMassar || e.code_massar || '',
        count: parseInt(e.count, 10)
      })),
      classesEnAlerte,
      totalElevesActifs,
      elevesParNiveau,
      totalElevesInactifs
    };
  }

  // Refined evolution query respecting the NO TO_CHAR rules
  async getDashboardEvolution(filters?: Partial<FilterAbsenceDto>) {
      // "evolutionSemaine : compatibilité SQLite (strftime) ET PostgreSQL (DATE_TRUNC)."
  }
}
