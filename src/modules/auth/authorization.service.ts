import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { calculerPermissionsRoles } from './access-control.policy.js';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenirPermissions(utilisateurId: number): Promise<Set<string>> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: {
        rolesAssignees: { select: { role: { select: { code: true } } } },
        permissionsPersonnalisees: {
          select: { autorisee: true, permission: { select: { code: true } } },
        },
      },
    });
    if (utilisateur === null) {
      throw new UnauthorizedException(
        "L'utilisateur authentifié est introuvable.",
      );
    }

    const configurables =
      utilisateur.rolesAssignees.length === 0
        ? []
        : await this.prisma.roleConfigPermission.findMany({
            where: {
              role: {
                code: {
                  in: utilisateur.rolesAssignees.map(({ role }) => role.code),
                },
              },
            },
            select: {
              autorisee: true,
              role: { select: { code: true } },
              permission: { select: { code: true } },
            },
          });

    const permissions = calculerPermissionsRoles(
      utilisateur.rolesAssignees.map(({ role }) => role.code),
      configurables.map(({ autorisee, role, permission }) => ({
        roleCode: role.code,
        permissionCode: permission.code,
        autorisee,
      })),
    );
    for (const exception of utilisateur.permissionsPersonnalisees) {
      if (exception.autorisee) permissions.add(exception.permission.code);
      else permissions.delete(exception.permission.code);
    }
    return permissions;
  }

  async estAdministrateur(utilisateurId: number): Promise<boolean> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: {
        rolesAssignees: {
          select: { role: { select: { code: true } } },
        },
      },
    });
    if (utilisateur === null) {
      throw new UnauthorizedException(
        "L'utilisateur authentifié est introuvable.",
      );
    }
    return utilisateur.rolesAssignees.some(
      ({ role }) => role.code === 'ADMINISTRATEUR',
    );
  }
}
