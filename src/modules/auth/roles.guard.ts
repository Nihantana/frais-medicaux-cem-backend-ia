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
import { ROLES_REQUIS } from './authorization.decorators.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_REQUIS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required === undefined || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & RequeteAuthentifiee>();
    const user = request.user;
    if (user === undefined) {
      throw new UnauthorizedException(
        "Aucun utilisateur authentifié n'est disponible.",
      );
    }
    const roles = new Set([user.role, ...user.roles].map((role) => role.toUpperCase()));
    if (!required.some((role) => roles.has(role))) {
      throw new ForbiddenException(
        "L'utilisateur authentifié ne possède aucun rôle requis.",
      );
    }
    return true;
  }
}
