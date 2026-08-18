import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@tica/database';

export const ROLES_KEY = 'roles';

/** Marca um handler/controller como exigindo um dos papéis informados. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
