// backend/src/features/eleves/eleves.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ElevesRepository } from './eleves.repository';
import { CreateEleveDto } from './dto/create-eleve.dto';
import { UpdateEleveDto } from './dto/update-eleve.dto';
import { FilterEleveDto } from './dto/filter-eleve.dto';
import { Eleve } from '../../entities/eleve.entity';
import { User, Role } from '../../entities/user.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ElevesService {
  constructor(
    private readonly elevesRepository: ElevesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: FilterEleveDto, currentUser: User) {
    const enseignantId = currentUser.role === Role.ENSEIGNANT ? currentUser.id : undefined;
    const parentId = currentUser.role === Role.PARENT ? currentUser.id : undefined;
    return this.elevesRepository.findWithFilters(filters, enseignantId, parentId);
  }

  async findByParent(parentId: string): Promise<Eleve[]> {
    return this.elevesRepository.findByParent(parentId);
  }

  async findById(id: string): Promise<Eleve> {
    const eleve = await this.elevesRepository.findById(id);
    if (!eleve) {
      throw new NotFoundException('Élève introuvable');
    }
    return eleve;
  }

  async create(dto: CreateEleveDto, currentUser?: User): Promise<Eleve> {
    const exists = await this.elevesRepository.checkCodeMassar(dto.codeMassar);
    if (exists) {
      throw new ConflictException('Ce code Massar est déjà enregistré');
    }

    if (dto.classeId === 'none' || dto.classeId === 'null' || dto.classeId === '') {
      dto.classeId = null;
    }
    if (dto.parentId === 'none' || dto.parentId === 'null' || dto.parentId === '') {
      dto.parentId = null;
    }

    const eleveToCreate = this.elevesRepository.create(dto);
    const saved = await this.elevesRepository.save(eleveToCreate);

    if (currentUser) {
      await this.auditService.log('CREATE', 'ELEVE', saved.id, currentUser.id, {
        nom: saved.nom,
        prenom: saved.prenom,
        codeMassar: saved.codeMassar,
        classeId: saved.classeId,
        parentId: saved.parentId,
      });
    }

    return saved;
  }

  async update(id: string, dto: UpdateEleveDto, currentUser?: User): Promise<Eleve> {
    const eleve = await this.elevesRepository.findById(id);
    if (!eleve) {
      throw new NotFoundException('Élève introuvable');
    }

    if (dto.codeMassar) {
      const exists = await this.elevesRepository.checkCodeMassar(dto.codeMassar, id);
      if (exists) {
        throw new ConflictException('Ce code Massar est déjà enregistré');
      }
    }

    const oldValues = {
      nom: eleve.nom,
      prenom: eleve.prenom,
      codeMassar: eleve.codeMassar,
      classeId: eleve.classeId,
      parentId: eleve.parentId,
      actif: eleve.actif,
      birthDate: eleve.birthDate,
    };

    if (dto.classeId !== undefined) {
      if (dto.classeId === null || dto.classeId === 'null' || dto.classeId === 'none' || dto.classeId === '') {
        eleve.classeId = null;
        eleve.classe = undefined;
      } else {
        eleve.classeId = dto.classeId;
        eleve.classe = { id: dto.classeId } as any;
      }
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === null || dto.parentId === 'null' || dto.parentId === 'none' || dto.parentId === '') {
        eleve.parentId = null;
        eleve.parent = undefined;
      } else {
        eleve.parentId = dto.parentId;
        eleve.parent = { id: dto.parentId } as any;
      }
    }

    // copy other fields manual safe assign
    if (dto.nom !== undefined) eleve.nom = dto.nom;
    if (dto.prenom !== undefined) eleve.prenom = dto.prenom;
    if (dto.codeMassar !== undefined) eleve.codeMassar = dto.codeMassar;
    if (dto.birthDate !== undefined) eleve.birthDate = new Date(dto.birthDate);
    if (dto.actif !== undefined) eleve.actif = dto.actif;

    const saved = await this.elevesRepository.save(eleve);

    if (currentUser) {
      const changes: any = {};
      const relevantKeys: (keyof typeof oldValues)[] = ['nom', 'prenom', 'codeMassar', 'classeId', 'parentId', 'actif', 'birthDate'];
      for (const key of relevantKeys) {
        if (dto[key] !== undefined && dto[key] !== oldValues[key]) {
          changes[key] = { old: oldValues[key], new: dto[key] };
        }
      }
      if (Object.keys(changes).length > 0) {
        await this.auditService.log('UPDATE', 'ELEVE', saved.id, currentUser.id, changes);
      }
    }

    return saved;
  }

  async getStats(id: string) {
    const eleve = await this.elevesRepository.findById(id);
    if (!eleve) {
      throw new NotFoundException('Élève introuvable');
    }
    return this.elevesRepository.getStats(id);
  }
}
