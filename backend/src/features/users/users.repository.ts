// backend/src/features/users/users.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User, Role } from '../../entities/user.entity';

export type SafeUser = Omit<User, 'password' | 'refreshToken'>;

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(@Inject(DataSource) private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.find({
      order: { role: 'ASC', nom: 'ASC' },
      select: ['id', 'username', 'cin', 'contact', 'nom', 'prenom', 'role', 'actif', 'matiere', 'poste', 'createdAt', 'updatedAt'],
    });
    return users as SafeUser[];
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.findOne({
      where: { id },
      select: ['id', 'username', 'cin', 'contact', 'nom', 'prenom', 'role', 'actif', 'matiere', 'poste', 'createdAt', 'updatedAt'],
    });
    return user as SafeUser | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }

  async findByIdFull(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  }

  async findByRole(role: Role): Promise<SafeUser[]> {
    const users = await this.find({
      where: { role },
      order: { nom: 'ASC' },
      select: ['id', 'username', 'cin', 'contact', 'nom', 'prenom', 'role', 'actif', 'matiere', 'poste', 'createdAt', 'updatedAt'],
    });
    return users as SafeUser[];
  }

  async checkUsernameExists(username: string, excludeId?: string): Promise<boolean> {
    const qb = this.createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username });
      
    if (excludeId) {
      qb.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async checkCinExists(cin: string, excludeId?: string): Promise<boolean> {
    const qb = this.createQueryBuilder('user')
      .where('LOWER(user.cin) = LOWER(:cin)', { cin });
      
    if (excludeId) {
      qb.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
