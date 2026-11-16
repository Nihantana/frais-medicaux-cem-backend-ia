import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleUtilisateur } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenirPermissions(utilisateurId: number): Promise<Set<string>> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: {
        role: true,
        rolesAssignees: { select: { roleId: true } },
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

    const [legacy, configurables] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: { role: utilisateur.role, autorisee: true },
        select: { permission: { select: { code: true } } },
      }),
      this.prisma.roleConfigPermission.findMany({
        where: {
          roleId: { in: utilisateur.rolesAssignees.map(({ roleId }) => roleId) },
          autorisee: true,
        },
        select: { permission: { select: { code: true } } },
      }),
    ]);

    const permissions = new Set(
      [...legacy, ...configurables].map(({ permission }) => permission.code),
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
        role: true,
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
    return (
      utilisateur.role === RoleUtilisateur.ADMINISTRATEUR ||
      utilisateur.rolesAssignees.some(
        ({ role }) => role.code === 'ADMINISTRATEUR',
      )
    );
  }
}
