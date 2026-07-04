// backend/src/features/seances/seances.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SeancesRepository } from './seances.repository';
import { CreateSeanceDto } from './dto/create-seance.dto';
import { UpdateSeanceDto } from './dto/update-seance.dto';
import { DataSource } from 'typeorm';
import { Absence, EtatAbsence } from '../../entities/absence.entity';
import { Eleve } from '../../entities/eleve.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SeancesService {
  constructor(
    private readonly seancesRepository: SeancesRepository,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private heureToMinutes(h: string): number {
    const parts = h.split(':');
    if (parts.length !== 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  private isValideSchedule(heureDebut: string, heureFin: string): boolean {
    const minDeb = this.heureToMinutes(heureDebut);
    const minFin = this.heureToMinutes(heureFin);
    
    const matDeb = this.heureToMinutes('08:30');
    const matFin = this.heureToMinutes('12:30');
    const amDeb = this.heureToMinutes('14:30');
    const amFin = this.heureToMinutes('18:30');

    if (minDeb >= matDeb && minFin <= matFin) return true;
    if (minDeb >= amDeb && minFin <= amFin) return true;
    
    return false;
  }

  async findAll(filters: { enseignantId?: string; classeId?: string; matiere?: string; actif?: boolean; classeIds?: string[] }, currentUser: any) {
    if (currentUser.role === 'ENSEIGNANT') {
      filters.enseignantId = currentUser.id;
    }
    if (currentUser.role === 'PARENT') {
      const kids = await this.dataSource.getRepository(Eleve).find({
        where: { parentId: currentUser.id }
      });
      const childClasseIds = kids.map(k => k.classeId).filter(Boolean) as string[];
      
      if (filters.classeId) {
        if (!childClasseIds.includes(filters.classeId)) {
          throw new ForbiddenException("Vous n'êtes pas autorisé à consulter l'emploi de temps de cette classe");
        }
      } else {
        filters.classeIds = childClasseIds;
      }
    }
    return this.seancesRepository.findAll(filters);
  }

  async findByEnseignant(enseignantId: string, actifOnly?: boolean) {
    return this.seancesRepository.findByEnseignant(enseignantId, actifOnly);
  }

  async findByClasse(classeId: string, actifOnly?: boolean, currentUser?: any) {
    if (currentUser && currentUser.role === 'PARENT') {
      const kids = await this.dataSource.getRepository(Eleve).find({
        where: { parentId: currentUser.id }
      });
      const childClasseIds = kids.map(k => k.classeId).filter(Boolean) as string[];
      if (!childClasseIds.includes(classeId)) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à consulter l'emploi de temps de cette classe");
      }
    }
    return this.seancesRepository.findByClasse(classeId, actifOnly);
  }

  async findById(id: string) {
    const seance = await this.seancesRepository.findById(id);
    if (!seance) {
      throw new NotFoundException(`Séance with ID ${id} not found`);
    }
    return seance;
  }

  async create(dto: CreateSeanceDto, currentUser: any) {
    if (this.heureToMinutes(dto.heureFin) <= this.heureToMinutes(dto.heureDebut)) {
      throw new BadRequestException("L'heure de fin doit être strictement après l'heure de début");
    }

    if (!this.isValideSchedule(dto.heureDebut, dto.heureFin)) {
      throw new BadRequestException("Les séances doivent être planifiées entre 08:30 et 12:30, ou entre 14:30 et 18:30.");
    }

    const conflitEnseignant = await this.seancesRepository.checkConflitEnseignant(
      dto.enseignantId,
      dto.jourSemaine,
      dto.heureDebut,
      dto.heureFin
    );

    if (conflitEnseignant) {
      const userPrenom = conflitEnseignant.enseignant?.prenom || 'L\'enseignant';
      throw new BadRequestException(`Conflit horaire : ${userPrenom} a déjà une séance le ${dto.jourSemaine} de ${conflitEnseignant.heureDebut} à ${conflitEnseignant.heureFin}`);
    }

    const conflitClasse = await this.seancesRepository.checkConflitClasse(
      dto.classeId,
      dto.jourSemaine,
      dto.heureDebut,
      dto.heureFin
    );

    if (conflitClasse) {
      const classeName = conflitClasse.classe ? `${conflitClasse.classe.niveau} - ${conflitClasse.classe.numero}` : 'La classe';
      throw new BadRequestException(`Conflit horaire : ${classeName} a déjà une séance le ${dto.jourSemaine} de ${conflitClasse.heureDebut} à ${conflitClasse.heureFin}`);
    }

    if (dto.salle) {
      const conflitSalle = await this.seancesRepository.checkConflitSalle(
        dto.salle,
        dto.jourSemaine,
        dto.heureDebut,
        dto.heureFin
      );
      if (conflitSalle) {
        throw new BadRequestException(`Conflit de salle : La salle ${dto.salle} est déjà occupée le ${dto.jourSemaine} de ${conflitSalle.heureDebut} à ${conflitSalle.heureFin}`);
      }
    }

    const uniqueEnseignantCheck = await this.seancesRepository.checkUniqueEnseignantMatiereClasse(
      dto.classeId,
      dto.matiere,
      dto.enseignantId
    );

    if (uniqueEnseignantCheck) {
       if (dto.keepExistingTeacher) {
           dto.enseignantId = uniqueEnseignantCheck.enseignantId;
           
           const conflitReCheck = await this.seancesRepository.checkConflitEnseignant(
             dto.enseignantId,
             dto.jourSemaine,
             dto.heureDebut,
             dto.heureFin
           );
           if (conflitReCheck) {
               throw new BadRequestException(`Impossible de conserver l'enseignant courant car il (elle) a déjà une séance à cet horaire.`);
           }
       } else if (dto.forceChangeTeacher) {
           await this.seancesRepository.update(
               { classeId: dto.classeId, matiere: dto.matiere },
               { enseignantId: dto.enseignantId }
           );
       } else {
           const nom = uniqueEnseignantCheck.enseignant?.prenom + ' ' + uniqueEnseignantCheck.enseignant?.nom;
           const classeName = uniqueEnseignantCheck.classe ? `${uniqueEnseignantCheck.classe.niveau}-${uniqueEnseignantCheck.classe.numero}` : 'cette classe';
           throw new BadRequestException({
              message: `La classe ${classeName} est déjà affectée à un autre enseignant (${nom}) pour la matière ${dto.matiere}.`,
              code: 'TEACHER_CONFLICT',
              currentTeacherId: uniqueEnseignantCheck.enseignantId,
              currentTeacherName: nom,
           });
       }
    }

    let seance = this.seancesRepository.create(dto);

    // Check for a soft-deleted session that would trigger the old UNIQUE constraint
    // (enseignantId, classeId, jourSemaine, heureDebut)
    const softDeleted = await this.seancesRepository.findOne({
      where: {
        enseignantId: dto.enseignantId,
        classeId: dto.classeId,
        jourSemaine: dto.jourSemaine,
        heureDebut: dto.heureDebut
      },
      withDeleted: true // in case soft delete via TypeORM is used, or we just rely on actif = false
    });
    
    if (softDeleted) {
      seance.id = softDeleted.id;
    }

    seance.actif = true; // MUST explicitly set true to restore it!
    const saved = await this.seancesRepository.save(seance);
    
    if (currentUser) {
      await this.auditService.log('CREATE', 'SEANCE', saved.id, currentUser.id, {
        jourSemaine: saved.jourSemaine,
        heureDebut: saved.heureDebut,
        heureFin: saved.heureFin,
        matiere: saved.matiere,
        classeId: saved.classeId,
        enseignantId: saved.enseignantId,
        salle: saved.salle,
      });
    }
    
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateSeanceDto, currentUser: any) {
    const seance = await this.findById(id);
    const oldValues = {
      jourSemaine: seance.jourSemaine,
      heureDebut: seance.heureDebut,
      heureFin: seance.heureFin,
      matiere: seance.matiere,
      classeId: seance.classeId,
      enseignantId: seance.enseignantId,
      salle: seance.salle,
    };

    const newDebut = dto.heureDebut || seance.heureDebut;
    const newFin = dto.heureFin || seance.heureFin;
    const newJour = dto.jourSemaine || seance.jourSemaine;
    const newEnseignantId = dto.enseignantId || seance.enseignantId;
    const newClasseId = dto.classeId || seance.classeId;

    if (this.heureToMinutes(newFin) <= this.heureToMinutes(newDebut)) {
      throw new BadRequestException("L'heure de fin doit être strictement après l'heure de début");
    }

    if (!this.isValideSchedule(newDebut, newFin)) {
      throw new BadRequestException("Les séances doivent être planifiées entre 08:30 et 12:30, ou entre 14:30 et 18:30.");
    }

    const isActif = dto.actif !== undefined ? dto.actif : seance.actif;

    if (isActif) {
      const conflitEnseignant = await this.seancesRepository.checkConflitEnseignant(
        newEnseignantId,
        newJour,
        newDebut,
        newFin,
        id
      );

      if (conflitEnseignant) {
        const userPrenom = conflitEnseignant.enseignant?.prenom || 'L\'enseignant';
        throw new BadRequestException(`Conflit horaire : ${userPrenom} a déjà une séance le ${newJour} de ${conflitEnseignant.heureDebut} à ${conflitEnseignant.heureFin}`);
      }

      const conflitClasse = await this.seancesRepository.checkConflitClasse(
        newClasseId,
        newJour,
        newDebut,
        newFin,
        id
      );

      if (conflitClasse) {
        const classeName = conflitClasse.classe ? `${conflitClasse.classe.niveau} - ${conflitClasse.classe.numero}` : 'La classe';
        throw new BadRequestException(`Conflit horaire : ${classeName} a déjà une séance le ${newJour} de ${conflitClasse.heureDebut} à ${conflitClasse.heureFin}`);
      }

      const newSalle = dto.salle !== undefined ? dto.salle : seance.salle;
      if (newSalle) {
        const conflitSalle = await this.seancesRepository.checkConflitSalle(
          newSalle,
          newJour,
          newDebut,
          newFin,
          id
        );
        if (conflitSalle) {
          throw new BadRequestException(`Conflit de salle : La salle ${newSalle} est déjà occupée le ${newJour} de ${conflitSalle.heureDebut} à ${conflitSalle.heureFin}`);
        }
      }
    }

    const uniqueEnseignantCheck = await this.seancesRepository.checkUniqueEnseignantMatiereClasse(
      newClasseId,
      dto.matiere || seance.matiere,
      newEnseignantId
    );

    if (uniqueEnseignantCheck) {
       if (dto.keepExistingTeacher) {
           dto.enseignantId = uniqueEnseignantCheck.enseignantId;
           
           const conflitReCheck = await this.seancesRepository.checkConflitEnseignant(
             dto.enseignantId,
             newJour,
             newDebut,
             newFin,
             id
           );
           if (conflitReCheck) {
               throw new BadRequestException(`Impossible de conserver l'enseignant courant car il (elle) a déjà une séance à cet horaire.`);
           }
       } else if (dto.forceChangeTeacher) {
           await this.seancesRepository.update(
               { classeId: newClasseId, matiere: dto.matiere || seance.matiere },
               { enseignantId: dto.enseignantId }
           );
       } else {
           const nom = uniqueEnseignantCheck.enseignant?.prenom + ' ' + uniqueEnseignantCheck.enseignant?.nom;
           const classeName = uniqueEnseignantCheck.classe ? `${uniqueEnseignantCheck.classe.niveau}-${uniqueEnseignantCheck.classe.numero}` : 'cette classe';
           throw new BadRequestException({
              message: `La classe ${classeName} est déjà affectée à un autre enseignant (${nom}) pour la matière ${dto.matiere || seance.matiere}.`,
              code: 'TEACHER_CONFLICT',
              currentTeacherId: uniqueEnseignantCheck.enseignantId,
              currentTeacherName: nom,
           });
       }
    }

    if (dto.enseignantId || dto.classeId) {
       (seance as any).enseignant = undefined;
       (seance as any).classe = undefined;
    }

    Object.assign(seance, dto);

    const softDeleted = await this.seancesRepository.findOne({
      where: {
        enseignantId: seance.enseignantId,
        classeId: seance.classeId,
        jourSemaine: seance.jourSemaine,
        heureDebut: seance.heureDebut
      }
    });

    if (softDeleted && softDeleted.id !== seance.id) {
       // A soft-deleted row exists with the same unique tuple!
       // We MUST delete the soft-deleted row so we can update this one.
       await this.seancesRepository.delete(softDeleted.id);
    }

    await this.seancesRepository.save(seance);

    if (currentUser) {
      const changes: any = {};
      const relevantKeys: (keyof typeof oldValues)[] = [
        'jourSemaine',
        'heureDebut',
        'heureFin',
        'matiere',
        'classeId',
        'enseignantId',
        'salle',
      ];
      for (const key of relevantKeys) {
        if (dto[key] !== undefined && dto[key] !== oldValues[key]) {
          changes[key] = { old: oldValues[key], new: dto[key] };
        }
      }
      if (Object.keys(changes).length > 0) {
        await this.auditService.log('UPDATE', 'SEANCE', seance.id, currentUser.id, changes);
      }
    }

    return this.findById(id);
  }

  async remove(id: string, currentUser: any) {
    const seance = await this.findById(id);

    const absencesCount = await this.dataSource.getRepository(Absence).count({
      where: {
        seanceId: id,
        etat: EtatAbsence.EN_ATTENTE,
      },
    });

    if (absencesCount > 0) {
      throw new BadRequestException("Des absences en attente sont liées. Traitez-les d'abord");
    }

    await this.seancesRepository.update(id, { actif: false });
    if (currentUser) {
      await this.auditService.log('DELETE', 'SEANCE', seance.id, currentUser.id, {
        jourSemaine: seance.jourSemaine,
        heureDebut: seance.heureDebut,
        heureFin: seance.heureFin,
        matiere: seance.matiere,
      });
    }
    return { success: true, message: 'Séance désactivée avec succès' };
  }
}
