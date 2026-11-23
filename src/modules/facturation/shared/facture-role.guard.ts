import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { AuthorizationService } from '../../auth/authorization.service.js';
import { KeycloakAuthService } from '../../auth/keycloak-auth.service.js';

interface RequeteAvecUtilisateur extends Request {
  user?: { id: number; permissions: readonly string[] };
}

@Injectable()
export class FactureRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
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
    const [utilisateur, permissions] = await Promise.all([
      this.prisma.utilisateur.findUnique({
        where: { id: utilisateurId },
        select: { id: true },
      }),
      this.authorization.obtenirPermissions(utilisateurId),
    ]);

    if (utilisateur === null) {
      throw new UnauthorizedException(
        "L'utilisateur authentifié est introuvable.",
      );
    }
    requete.user = {
      id: utilisateur.id,
      permissions: [...permissions],
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
