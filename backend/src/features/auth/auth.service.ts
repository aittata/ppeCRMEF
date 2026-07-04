// backend/src/features/auth/auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditService } from '../audit/audit.service';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Omit<User, 'password' | 'refreshToken'>;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DataSource) private dataSource: DataSource,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(ConfigService) private configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    try {
      const userRepository = this.dataSource.getRepository(User);
      const user = await userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.username) = LOWER(:username)', { username: dto.username })
        .getOne();

      if (!user) {
        throw new UnauthorizedException('Identifiants incorrects');
      }

      const isMatch = await bcryptjs.compare(dto.password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Identifiants incorrects');
      }

      if (!user.actif) {
        throw new ForbiddenException("Compte désactivé. Contactez l'administration.");
      }

      const refreshSecret = this.configService.get<string>('jwt.refreshSecret') ?? 'super-secret-refresh-min-32-chars-change-in-prod';
      const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

      const [access_token, refresh_token] = await Promise.all([
        this.jwtService.signAsync({ sub: user.id, username: user.username, role: user.role }),
        this.jwtService.signAsync(
          { sub: user.id },
          { secret: refreshSecret, expiresIn: refreshExpiresIn }
        ),
      ]);

      user.refreshToken = await bcryptjs.hash(refresh_token, 10);
      await userRepository.save(user);

      const { password: _, refreshToken: __, ...safeUser } = user;
      return { access_token, refresh_token, user: safeUser as any };
    } catch (e: any) {
      console.error('Login method error:', e);
      if (e instanceof UnauthorizedException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Login failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async refresh(userId: string, targetToken: string): Promise<{ access_token: string }> {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });
    
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const access_token = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return { access_token };
  }

  async logout(userId: string): Promise<{ message: string }> {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });
    if (user) {
      user.refreshToken = null as any;
      await userRepository.save(user);
    }
    return { message: 'Déconnexion réussie' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password', 'refreshToken'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const isMatch = await bcryptjs.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Ancien mot de passe incorrect');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    user.password = await bcryptjs.hash(dto.newPassword, 10);
    user.refreshToken = null as any;
    await userRepository.save(user);

    // Enregistrer dans l'entité d'audit
    await this.auditService.log('UPDATE', 'USER', userId, userId, {
      password: { old: '*******', new: '*******' }
    });

    return { message: 'Mot de passe modifié avec succès. Veuillez vous reconnecter.' };
  }
}
