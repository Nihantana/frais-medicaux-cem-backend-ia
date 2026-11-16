import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RequeteAuthentifiee } from './auth.types.js';
import { KeycloakAuthService } from './keycloak-auth.service.js';

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(private readonly auth: KeycloakAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & RequeteAuthentifiee>();
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
    return true;
  }
}
