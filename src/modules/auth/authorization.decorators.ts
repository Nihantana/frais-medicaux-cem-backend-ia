import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_REQUISES = 'permissions_requises';
export const ROLES_REQUIS = 'roles_requis';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_REQUISES, permissions);

export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_REQUIS, roles.map((role) => role.toUpperCase()));
