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
import {
  PERMISSIONS_ALTERNATIVES_REQUISES,
  PERMISSIONS_REQUISES,
  PERMISSIONS_RESSOURCE_REQUISES,
  type PermissionsRessource,
} from './authorization.decorators.js';
import { KeycloakAuthService } from './keycloak-auth.service.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
    private readonly auth: KeycloakAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const explicit = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_REQUISES,
      [context.getHandler(), context.getClass()],
    );
    const alternatives = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ALTERNATIVES_REQUISES,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & RequeteAuthentifiee>();
    const resource = this.reflector.getAllAndOverride<PermissionsRessource>(
      PERMISSIONS_RESSOURCE_REQUISES,
      [context.getHandler(), context.getClass()],
    );
    const required =
      explicit ??
      (resource === undefined
        ? []
        : [
            request.method === 'GET' || request.method === 'HEAD'
              ? resource.lecture
              : resource.ecriture,
          ]);
    if (required.length === 0 && (alternatives?.length ?? 0) === 0) return true;

    if (request.user === undefined) {
      const authorization = request.headers.authorization;
      if (authorization === undefined || !authorization.startsWith('Bearer ')) {
        throw new UnauthorizedException(
          'Un jeton Bearer est requis pour cette ressource.',
        );
      }
      const token = authorization.slice('Bearer '.length).trim();
      if (token === '') {
        throw new UnauthorizedException('Le jeton Bearer est vide.');
      }
      request.user = await this.auth.authentifier(token);
    }

    const permissions = await this.authorization.obtenirPermissions(
      request.user.id,
    );
    const manque = required.find((permission) => !permissions.has(permission));
    if (
      manque !== undefined ||
      (alternatives !== undefined &&
        !alternatives.some((permission) => permissions.has(permission)))
    ) {
      throw new ForbiddenException(
        `La permission ${manque ?? alternatives?.join(' ou ')} n'est pas accordée à cet utilisateur.`,
      );
    }
    return true;
  }
}
