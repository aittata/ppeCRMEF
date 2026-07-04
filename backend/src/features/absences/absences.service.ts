// backend/src/features/absences/absences.service.ts
import { Injectable, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AbsencesRepository } from './absences.repository';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateEtatDto, BulkUpdateEtatDto } from './dto/update-etat.dto';
import { FilterAbsenceDto } from './dto/filter-absence.dto';
import { Role, User } from '../../entities/user.entity';
import { SeancesService } from '../seances/seances.service';
import { ElevesService } from '../eleves/eleves.service';
import { EtatAbsence } from '../../entities/absence.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AbsencesService {
  constructor(
    private readonly absencesRepository: AbsencesRepository,
    private readonly seancesService: SeancesService,
    private readonly elevesService: ElevesService,
    private readonly auditService: AuditService
  ) {}

  async findAll(filters: FilterAbsenceDto, user: User) {
    const saisieParId = user.role === Role.ENSEIGNANT ? user.id : undefined;
    let parentEleveIds: string[] | undefined = undefined;
    if (user.role === Role.PARENT) {
      const kids = await this.elevesService.findByParent(user.id);
      parentEleveIds = kids.map(k => k.id);
    }
    return this.absencesRepository.findWithFilters(filters, saisieParId, parentEleveIds);
  }

  async findById(id: string, user: User) {
    const absence = await this.absencesRepository.findById(id);
    if (!absence) {
      throw new NotFoundException('Absence non trouvée');
    }
    
    if (user.role === Role.ENSEIGNANT && absence.saisieParId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez consulter que les absences de vos séances');
    }

    if (user.role === Role.PARENT) {
      const kids = await this.elevesService.findByParent(user.id);
      const childIds = kids.map(k => k.id);
      if (!childIds.includes(absence.eleveId)) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à consulter cette absence");
      }
    }
    
    return absence;
  }

  async create(dto: CreateAbsenceDto, user: User) {
    let { 
      eleveId,
      date,
      seanceId,
      heureDebut,
      heureFin,
      matiere,
      classeId,
      motif
    } = dto;

    const eleve = await this.elevesService.findById(eleveId);
    if (!eleve) {
      throw new NotFoundException('Élève non trouvé');
    }

    if (seanceId) {
      // R1. Saisie absence avec seanceId fourni
      const seance = await this.seancesService.findById(seanceId);
      if (!seance) {
        throw new NotFoundException('Séance non trouvée');
      }

      if (user.role === Role.ENSEIGNANT && seance.enseignantId !== user.id) {
        throw new ForbiddenException('Vous ne pouvez pas saisir d\'absence pour une séance que vous n\'enseignez pas');
      }

      if (eleve.classeId !== seance.classeId) {
        throw new BadRequestException('L\'élève n\'appartient pas à la classe de cette séance');
      }

      heureDebut = seance.heureDebut;
      heureFin = seance.heureFin;
      matiere = seance.matiere;
      classeId = seance.classeId;
    } else {
      // R2. Saisie sans seanceId
      if (!heureDebut || !heureFin || !matiere || !classeId) {
        throw new BadRequestException('Les champs heureDebut, heureFin, matiere et classeId sont obligatoires pour une saisie manuelle');
      }
    }

    // R3. Doublon
    const exists = await this.absencesRepository.checkDoublon(eleveId, date, heureDebut as string);
    if (exists) {
      throw new ConflictException('Une absence existe déjà pour cet élève à ce créneau');
    }

    const absence = this.absencesRepository.create({
      eleveId,
      date: new Date(date), // Date object 
      seanceId,
      heureDebut: heureDebut as string,
      heureFin: heureFin as string,
      matiere: matiere as string,
      classeId: classeId as string,
      motif,
      etat: EtatAbsence.EN_ATTENTE,
      saisieParId: user.id
    });

    const savedAbsence = await this.absencesRepository.save(absence);
    
    await this.auditService.log('CREATE', 'ABSENCE', savedAbsence.id, user.id, {
      eleveId, 
      date, 
      heureDebut, 
      heureFin, 
      matiere, 
      classeId, 
      motif, 
      etat: savedAbsence.etat,
      codeMassar: eleve.codeMassar,
      eleveNom: eleve.nom,
      elevePrenom: eleve.prenom
    });

    return savedAbsence;
  }

  async updateEtat(id: string, dto: UpdateEtatDto, user: User) {
    if (user.role === Role.ENSEIGNANT) {
      throw new ForbiddenException('Un enseignant ne peut pas modifier l\'état d\'une absence');
    }

    const absence = await this.absencesRepository.findOne({
      where: { id },
      relations: ['eleve'],
    });
    if (!absence) {
      throw new NotFoundException('Absence non trouvée');
    }

    const oldState = { etat: absence.etat, motif: absence.motif };

    absence.etat = dto.etat;
    if (dto.motif !== undefined) {
      absence.motif = dto.motif;
    }
    absence.modifieeParId = user.id;

    const savedAbsence = await this.absencesRepository.save(absence);

    await this.auditService.log('UPDATE', 'ABSENCE', savedAbsence.id, user.id, {
      etat: { old: oldState.etat, new: savedAbsence.etat },
      motif: { old: oldState.motif, new: savedAbsence.motif },
      eleveId: absence.eleveId,
      date: absence.date,
      heureDebut: absence.heureDebut,
      heureFin: absence.heureFin,
      codeMassar: absence.eleve?.codeMassar,
      eleveNom: absence.eleve?.nom,
      elevePrenom: absence.eleve?.prenom
    });

    return savedAbsence;
  }

  async bulkUpdateEtat(dto: BulkUpdateEtatDto, user: User) {
    if (user.role === Role.ENSEIGNANT) {
      throw new ForbiddenException('Un enseignant ne peut pas modifier l\'état d\'une absence');
    }

    const { ids, etat, motif } = dto;
    if (!ids || ids.length === 0) {
      return [];
    }

    const absences = await this.absencesRepository.createQueryBuilder('absence')
      .leftJoinAndSelect('absence.eleve', 'eleve')
      .where('absence.id IN (:...ids)', { ids })
      .getMany();

    const updatedAbsences = [];
    for (const absence of absences) {
      const oldState = { etat: absence.etat, motif: absence.motif };
      absence.etat = etat;
      if (motif !== undefined) {
        absence.motif = motif;
      }
      absence.modifieeParId = user.id;
      const saved = await this.absencesRepository.save(absence);
      updatedAbsences.push(saved);

      await this.auditService.log('UPDATE', 'ABSENCE', saved.id, user.id, {
        etat: { old: oldState.etat, new: saved.etat },
        motif: { old: oldState.motif, new: saved.motif },
        eleveId: absence.eleveId,
        date: absence.date,
        heureDebut: absence.heureDebut,
        heureFin: absence.heureFin,
        codeMassar: absence.eleve?.codeMassar,
        eleveNom: absence.eleve?.nom,
        elevePrenom: absence.eleve?.prenom
      });
    }

    return updatedAbsences;
  }

  async remove(id: string, user: User) {
    const absence = await this.absencesRepository.findOne({
      where: { id },
      relations: ['eleve'],
    });
    if (!absence) {
      throw new NotFoundException('Absence non trouvée');
    }

    if (absence.etat !== EtatAbsence.EN_ATTENTE) {
      throw new ForbiddenException('Impossible de supprimer une absence qui n\'est plus en attente');
    }

    if (user.role === Role.ENSEIGNANT && absence.saisieParId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres saisies en attente');
    }

    await this.auditService.log('DELETE', 'ABSENCE', absence.id, user.id, {
      eleveId: absence.eleveId,
      date: absence.date,
      heureDebut: absence.heureDebut,
      heureFin: absence.heureFin,
      etat: absence.etat,
      codeMassar: absence.eleve?.codeMassar,
      eleveNom: absence.eleve?.nom,
      elevePrenom: absence.eleve?.prenom
    });

    await this.absencesRepository.remove(absence);
    return { success: true, message: 'Absence supprimée avec succès' };
  }

  async getDashboardStats(filters?: FilterAbsenceDto) {
    return this.absencesRepository.getDashboardStats(filters);
  }

  async getForExport(filters: FilterAbsenceDto, user: User) {
    const saisieParId = user.role === Role.ENSEIGNANT ? user.id : undefined;
    let parentEleveIds: string[] | undefined = undefined;
    if (user.role === Role.PARENT) {
      const kids = await this.elevesService.findByParent(user.id);
      parentEleveIds = kids.map(k => k.id);
    }
    return this.absencesRepository.findForExport(filters, saisieParId, 5000, parentEleveIds);
  }
}
