// backend/src/features/users/users.service.ts
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository, SafeUser } from './users.repository';
import * as bcryptjs from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { DataSource, In } from 'typeorm';
import { Eleve } from '../../entities/eleve.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<SafeUser[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  async findByRole(role: Role): Promise<SafeUser[]> {
    return this.usersRepository.findByRole(role);
  }

  async getAuditLogs(entityId: string): Promise<AuditLog[]> {
    return this.dataSource.getRepository(AuditLog).find({
      where: { entityId, entityName: 'USER' },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateUserDto, currentUser?: { id: string, role: Role }): Promise<SafeUser> {
    const role = dto.role || Role.ENSEIGNANT;
    
    if (currentUser?.role === Role.CADRE_ADMINISTRATIF && role !== Role.ENSEIGNANT && role !== Role.PARENT) {
        throw new BadRequestException("Un cadre administratif ne peut créer que des enseignants ou des parents");
    }

    if (role === Role.ENSEIGNANT && !dto.matiere) {
      throw new BadRequestException('La matière est obligatoire pour un enseignant');
    }
    if (role === Role.CADRE_ADMINISTRATIF && !dto.poste) {
      throw new BadRequestException('Le poste est obligatoire pour un cadre administratif');
    }

    const exists = await this.usersRepository.checkUsernameExists(dto.username);
    if (exists) {
      throw new ConflictException("Ce nom d'utilisateur est déjà utilisé");
    }

    if (dto.cin) {
      const cinExists = await this.usersRepository.checkCinExists(dto.cin);
      if (cinExists) {
        throw new ConflictException("Ce CIN est déjà utilisé");
      }
    }

    const hashedPassword = await bcryptjs.hash(dto.password, 10);
    
    const userToCreate = this.usersRepository.create({
      ...dto,
      role,
      password: hashedPassword,
      matiere: role === Role.ENSEIGNANT ? dto.matiere : undefined,
      poste: role === Role.CADRE_ADMINISTRATIF ? dto.poste : (role === Role.ADMIN ? 'Directeur' : undefined),
    });

    const savedUser = await this.usersRepository.save(userToCreate);

    if (role === Role.PARENT && dto.eleveIds && dto.eleveIds.length > 0) {
      const eleves = await this.dataSource.getRepository(Eleve).find({
        where: { id: In(dto.eleveIds) },
        relations: ['parent']
      });
      const errors: string[] = [];
      for (const eleve of eleves) {
        if (eleve.parentId) {
          const cinStr = eleve.parent?.cin ? ` ${eleve.parent.cin}` : '';
          errors.push(`L'élève ${eleve.nom} ${eleve.prenom} est déjà assigné au parent ${eleve.parent?.nom || ''} ${eleve.parent?.prenom || ''}${cinStr}`.trim() + '.');
        }
      }

      if (errors.length > 0) {
        throw new ConflictException(errors);
      }

      await this.dataSource
        .createQueryBuilder()
        .update(Eleve)
        .set({ parentId: savedUser.id })
        .whereInIds(dto.eleveIds)
        .execute();
    }
    
    if (currentUser?.id) {
        await this.auditService.log('CREATE', 'USER', savedUser.id, currentUser.id, {
            username: { old: null, new: savedUser.username },
            role: { old: null, new: savedUser.role },
            nom: { old: null, new: savedUser.nom },
            prenom: { old: null, new: savedUser.prenom }
        });
    }

    const { password: _, refreshToken: __, ...safeUser } = savedUser;
    
    return safeUser as SafeUser;
  }

  async update(id: string, dto: UpdateUserDto, currentUser?: { id: string, role: Role }): Promise<SafeUser> {
    const user = await this.usersRepository.findByIdFull(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (currentUser?.role === Role.CADRE_ADMINISTRATIF && user.role !== Role.ENSEIGNANT && user.role !== Role.PARENT) {
        throw new BadRequestException("Un cadre administratif ne peut modifier que les enseignants ou les parents");
    }

    if (dto.username) {
      const exists = await this.usersRepository.checkUsernameExists(dto.username, id);
      if (exists) {
        throw new ConflictException("Ce nom d'utilisateur est déjà utilisé");
      }
    }

    if (dto.cin) {
      const cinExists = await this.usersRepository.checkCinExists(dto.cin, id);
      if (cinExists) {
        throw new ConflictException("Ce CIN est déjà utilisé par un autre utilisateur");
      }
    }

    const newRole = dto.role || user.role;
    
    if (currentUser?.role === Role.CADRE_ADMINISTRATIF && newRole !== Role.ENSEIGNANT && newRole !== Role.PARENT) {
        throw new BadRequestException("Un cadre administratif ne peut pas changer le rôle vers autre chose qu'enseignant ou parent");
    }

    const newMatiere = dto.matiere !== undefined ? dto.matiere : user.matiere;
    const newPoste = dto.poste !== undefined ? dto.poste : user.poste;

    if (newRole === Role.ENSEIGNANT && !newMatiere) {
      throw new BadRequestException('La matière est obligatoire pour un enseignant');
    }
    if (newRole === Role.CADRE_ADMINISTRATIF && !newPoste) {
      throw new BadRequestException('Le poste est obligatoire pour un cadre administratif');
    }

    const changes: any = {};
    if (dto.password) {
      user.password = await bcryptjs.hash(dto.password, 10);
      user.refreshToken = null as any; 
      changes.password = { old: '***', new: '***' };
    }

    if (dto.username && dto.username !== user.username) {
        changes.username = { old: user.username, new: dto.username };
    }
    if (dto.cin && dto.cin !== user.cin) {
        changes.cin = { old: user.cin || null, new: dto.cin };
    }
    if (dto.contact && dto.contact !== user.contact) {
        changes.contact = { old: user.contact || null, new: dto.contact };
    }
    if (dto.nom && dto.nom !== user.nom) {
        changes.nom = { old: user.nom, new: dto.nom };
    }
    if (dto.prenom && dto.prenom !== user.prenom) {
        changes.prenom = { old: user.prenom, new: dto.prenom };
    }
    if (dto.role && dto.role !== user.role) {
        if (id === currentUser?.id) {
            throw new BadRequestException('Impossible de modifier son propre rôle');
        }
        if (user.role === Role.ADMIN) {
            throw new BadRequestException('Impossible de modifier le rôle dun autre administrateur');
        }
        changes.role = { old: user.role, new: dto.role };
    }
    if (dto.actif !== undefined && dto.actif !== user.actif) {
        changes.actif = { old: user.actif, new: dto.actif };
    }

    if (dto.username) user.username = dto.username;
    if (dto.cin) user.cin = dto.cin;
    if (dto.contact !== undefined) user.contact = dto.contact;
    if (dto.nom) user.nom = dto.nom;
    if (dto.prenom) user.prenom = dto.prenom;
    if (dto.role) user.role = dto.role;
    if (dto.actif !== undefined) user.actif = dto.actif;
    
    if (newRole === Role.ENSEIGNANT) {
        if (newMatiere !== user.matiere) changes.matiere = { old: user.matiere, new: newMatiere };
        user.matiere = newMatiere;
        user.poste = null as any;
    } else if (newRole === Role.CADRE_ADMINISTRATIF) {
        if (newPoste !== user.poste) changes.poste = { old: user.poste, new: newPoste };
        user.poste = newPoste;
        user.matiere = null as any;
    } else if (newRole === Role.ADMIN) {
        if (user.poste !== 'Directeur') changes.poste = { old: user.poste || null, new: 'Directeur' };
        user.poste = 'Directeur';
        user.matiere = null as any;
    } else {
        if (user.matiere) changes.matiere = { old: user.matiere, new: null };
        if (user.poste) changes.poste = { old: user.poste, new: null };
        user.matiere = null as any;
        user.poste = null as any;
    }

    const savedUser = await this.usersRepository.save(user);

    if (savedUser.role === Role.PARENT && dto.eleveIds !== undefined) {
      if (dto.eleveIds.length > 0) {
        const eleves = await this.dataSource.getRepository(Eleve).find({
          where: { id: In(dto.eleveIds) },
          relations: ['parent']
        });
        const errors: string[] = [];
        for (const eleve of eleves) {
          if (eleve.parentId && eleve.parentId !== id) {
            const cinStr = eleve.parent?.cin ? ` ${eleve.parent.cin}` : '';
            errors.push(`L'élève ${eleve.nom} ${eleve.prenom} est déjà assigné au parent ${eleve.parent?.nom || ''} ${eleve.parent?.prenom || ''}${cinStr}`.trim() + '.');
          }
        }
        if (errors.length > 0) {
          throw new ConflictException(errors);
        }
      }

      // 1. Dé-associer tous les élèves précédemment liés
      await this.dataSource
        .createQueryBuilder()
        .update(Eleve)
        .set({ parentId: null })
        .where('parentId = :parentId', { parentId: id })
        .execute();

      // 2. Associer les nouveaux si la liste n'est pas vide
      if (dto.eleveIds.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(Eleve)
          .set({ parentId: id })
          .whereInIds(dto.eleveIds)
          .execute();
      }
    }

    if (Object.keys(changes).length > 0 && currentUser?.id) {
        await this.auditService.log('UPDATE', 'USER', id, currentUser.id, changes);
    }

    const { password: _, refreshToken: __, ...safeUser } = savedUser;
    
    return safeUser as SafeUser;
  }

  async deactivate(id: string, currentUser?: { id: string, role: Role }): Promise<{ message: string }> {
    if (id === currentUser?.id) {
      throw new BadRequestException('Impossible de se désactiver soi-même');
    }

    const user = await this.usersRepository.findByIdFull(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    
    if (currentUser?.role === Role.CADRE_ADMINISTRATIF && user.role !== Role.ENSEIGNANT && user.role !== Role.PARENT) {
        throw new BadRequestException("Un cadre administratif ne peut désactiver que les enseignants ou les parents");
    }

    user.actif = false;
    user.refreshToken = null as any;
    await this.usersRepository.save(user);

    if (currentUser?.id) {
        await this.auditService.log('DEACTIVATE', 'USER', id, currentUser.id, {
            actif: { old: true, new: false }
        });
    }

    return { message: 'Utilisateur désactivé avec succès' };
  }

  async reactivate(id: string, currentUser?: { id: string, role: Role }): Promise<{ message: string }> {
    const user = await this.usersRepository.findByIdFull(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    
    if (currentUser?.role === Role.CADRE_ADMINISTRATIF && user.role !== Role.ENSEIGNANT && user.role !== Role.PARENT) {
        throw new BadRequestException("Un cadre administratif ne peut réactiver que les enseignants ou les parents");
    }

    user.actif = true;
    await this.usersRepository.save(user);

    if (currentUser?.id) {
        await this.auditService.log('REACTIVATE', 'USER', id, currentUser.id, {
            actif: { old: false, new: true }
        });
    }

    return { message: 'Utilisateur réactivé avec succès' };
  }
}
