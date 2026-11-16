import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RequeteAuthentifiee } from './auth.types.js';
import { AuthorizationService } from './authorization.service.js';
import { PERMISSIONS_REQUISES } from './authorization.decorators.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_REQUISES,
      [context.getHandler(), context.getClass()],
    );
    if (required === undefined || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & RequeteAuthentifiee>();
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException(
        "Aucun utilisateur authentifié n'est disponible.",
      );
    }

    const permissions = await this.authorization.obtenirPermissions(userId);
    const manque = required.find((permission) => !permissions.has(permission));
    if (manque !== undefined) {
      throw new ForbiddenException(
        `La permission ${manque} n'est pas accordée à cet utilisateur.`,
      );
    }
    return true;
  }
}
