// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Omit<User, 'password' | 'refreshToken'> => {
    const req = ctx.switchToHttp().getRequest<{ user: User }>();
    return req.user;
  }
);
