import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_REQUISES = 'permissions_requises';
export const PERMISSIONS_ALTERNATIVES_REQUISES =
  'permissions_alternatives_requises';
export const ROLES_REQUIS = 'roles_requis';
export const PERMISSIONS_RESSOURCE_REQUISES = 'permissions_ressource_requises';

export interface PermissionsRessource {
  lecture: string;
  ecriture: string;
}

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_REQUISES, permissions);

export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ALTERNATIVES_REQUISES, permissions);

export const RequireResourcePermissions = (
  lecture: string,
  ecriture: string,
) =>
  SetMetadata(PERMISSIONS_RESSOURCE_REQUISES, {
    lecture,
    ecriture,
  } satisfies PermissionsRessource);

export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_REQUIS, roles.map((role) => role.toUpperCase()));
