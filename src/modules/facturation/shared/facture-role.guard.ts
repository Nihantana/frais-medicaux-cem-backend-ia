import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { RoleUtilisateur } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { KeycloakAuthService } from '../../auth/keycloak-auth.service.js';

interface RequeteAvecUtilisateur extends Request {
  user?: { id: number; role: RoleUtilisateur; permissions: readonly string[] };
}

@Injectable()
export class FactureRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auth?: KeycloakAuthService,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const requete = contexte
      .switchToHttp()
      .getRequest<RequeteAvecUtilisateur>();
    if (this.auth === undefined) {
      throw new UnauthorizedException(
        "Le service d'authentification n'est pas configuré.",
      );
    }
    const token = this.obtenirToken(requete);
    const authentifie = await this.auth.authentifier(token);
    const utilisateurId = authentifie.id;
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: {
        id: true,
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
    const [permissionsLegacy, permissionsRoles] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: { role: utilisateur.role, autorisee: true },
        select: { permission: { select: { code: true } } },
      }),
      this.prisma.roleConfigPermission.findMany({
        where: {
          roleId: {
            in: utilisateur.rolesAssignees.map((role) => role.roleId),
          },
          autorisee: true,
        },
        select: { permission: { select: { code: true } } },
      }),
    ]);
    const permissions = new Map(
      [...permissionsLegacy, ...permissionsRoles].map((item) => [
        item.permission.code,
        true,
      ]),
    );
    for (const permission of utilisateur.permissionsPersonnalisees) {
      if (permission.autorisee) {
        permissions.set(permission.permission.code, true);
      } else {
        permissions.delete(permission.permission.code);
      }
    }
    requete.user = {
      id: utilisateur.id,
      role: utilisateur.role,
      permissions: [...permissions.keys()],
    };
    return true;
  }

  private obtenirToken(requete: RequeteAvecUtilisateur): string {
    const authorization = (requete as Request).headers.authorization;
    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Un jeton Bearer est requis pour cette ressource.',
      );
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (token === '') {
      throw new UnauthorizedException('Le jeton Bearer est vide.');
    }
    return token;
  }
}
