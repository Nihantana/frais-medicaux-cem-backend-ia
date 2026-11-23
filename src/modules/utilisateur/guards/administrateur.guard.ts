import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

interface RequeteAvecUtilisateur extends Request {
  user?: { id: number };
}

@Injectable()
export class AdministrateurGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequeteAvecUtilisateur>();
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException(
        "Aucun utilisateur authentifié n'est disponible.",
      );
    }

    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rolesAssignees: { select: { role: { select: { code: true } } } },
      },
    });
    if (user === null) {
      throw new UnauthorizedException(
        "L'utilisateur authentifié est introuvable.",
      );
    }
    const estAdministrateur = user.rolesAssignees.some(
      ({ role }) => role.code === 'ADMINISTRATEUR',
    );
    if (!estAdministrateur) {
      throw new ForbiddenException(
        "L'utilisateur authentifié n'est pas administrateur.",
      );
    }

    request.user = user;
    return true;
  }
}
