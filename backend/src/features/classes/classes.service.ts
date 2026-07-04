// backend/src/features/classes/classes.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ClassesRepository, FilterClasse } from './classes.repository';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';
import { Classe } from '../../entities/classe.entity';
import { AuditService } from '../audit/audit.service';
import { DataSource } from 'typeorm';
import { Eleve } from '../../entities/eleve.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class ClassesService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: FilterClasse): Promise<Classe[]> {
    return this.classesRepository.findAll(filters);
  }

  async findById(id: string): Promise<Classe> {
    const classe = await this.classesRepository.findById(id);
    if (!classe) {
      throw new NotFoundException('Classe introuvable');
    }
    return classe;
  }

  async findByEnseignant(enseignantId: string): Promise<Classe[]> {
    return this.classesRepository.findByEnseignant(enseignantId);
  }

  async create(dto: CreateClasseDto, currentUser?: User): Promise<Classe> {
    const exists = await this.classesRepository.checkDuplicate(dto.niveau, dto.numero);
    if (exists) {
      throw new ConflictException('Cette classe existe déjà');
    }

    const classe = this.classesRepository.create(dto);
    const saved = await this.classesRepository.save(classe);

    if (currentUser) {
      await this.auditService.log('CREATE', 'CLASSE', saved.id, currentUser.id, {
        niveau: saved.niveau,
        numero: saved.numero,
        actif: saved.actif,
      });
    }

    return saved;
  }

  async update(id: string, dto: UpdateClasseDto, currentUser?: User): Promise<Classe> {
    const classe = await this.classesRepository.findById(id);
    if (!classe) {
      throw new NotFoundException('Classe introuvable');
    }

    if (dto.niveau || dto.numero) {
      const niveau = dto.niveau || classe.niveau;
      const numero = dto.numero !== undefined ? dto.numero : classe.numero;

      const exists = await this.classesRepository.checkDuplicate(niveau, numero, id);
      if (exists) {
        throw new ConflictException('Cette classe existe déjà');
      }
    }

    const oldValues = {
      niveau: classe.niveau,
      numero: classe.numero,
      actif: classe.actif,
    };

    if (dto.actif === false && (classe.actif === true || classe.actif === undefined)) {
      // Deactivating the class: set all eleves of this class to unassigned (null)
      await this.dataSource.getRepository(Eleve).update({ classeId: id }, { classeId: null });
    }

    Object.assign(classe, dto);
    const saved = await this.classesRepository.save(classe);

    if (currentUser) {
      if (dto.actif === true && (oldValues.actif === false || oldValues.actif === undefined)) {
        await this.auditService.log('REACTIVATE', 'CLASSE', saved.id, currentUser.id, {
          actif: { old: false, new: true }
        });
      } else if (dto.actif === false && (oldValues.actif === true || oldValues.actif === undefined)) {
        await this.auditService.log('DEACTIVATE', 'CLASSE', saved.id, currentUser.id, {
          actif: { old: true, new: false }
        });
      } else {
        const changes: any = {};
        const relevantKeys: (keyof typeof oldValues)[] = ['niveau', 'numero', 'actif'];
        for (const key of relevantKeys) {
          if (dto[key] !== undefined && dto[key] !== oldValues[key]) {
            changes[key] = { old: oldValues[key], new: dto[key] };
          }
        }
        if (Object.keys(changes).length > 0) {
          await this.auditService.log('UPDATE', 'CLASSE', saved.id, currentUser.id, changes);
        }
      }
    }

    return saved;
  }

  async getStats(id: string) {
    const classe = await this.classesRepository.findById(id);
    if (!classe) {
      throw new NotFoundException('Classe introuvable');
    }
    return this.classesRepository.getStats(id);
  }
}
