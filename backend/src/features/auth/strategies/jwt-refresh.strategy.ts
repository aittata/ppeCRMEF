// backend/src/features/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { User } from '../../../entities/user.entity';

export interface JwtRefreshPayload {
  sub: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(DataSource) private dataSource: DataSource
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret') ?? 'super-secret-refresh-min-32-chars-change-in-prod',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const refreshToken = req.body.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Token de rafraichissement manquant');
    }

    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: payload.sub } });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Token invalide ou utilisateur introuvable');
    }

    const isMatch = await bcryptjs.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Token de rafraichissement invalide');
    }

    return { ...user, refreshToken };
  }
}
