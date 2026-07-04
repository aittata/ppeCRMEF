// backend/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role, ROLES_KEY } from '../../entities/user.entity';

export { ROLES_KEY };

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
