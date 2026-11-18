import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import { env } from '../../common/settings/env.validator.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { UtilisateurAuthentifie } from './auth.types.js';

interface KeycloakPayload extends JWTPayload {
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
}

@Injectable()
export class KeycloakAuthService {
  private readonly logger = new Logger(KeycloakAuthService.name);
  private readonly jwks = createRemoteJWKSet(new URL(env.KEYCLOAK_JWKS_URL));

  constructor(private readonly prisma: PrismaService) {}

  async authentifier(token: string): Promise<UtilisateurAuthentifie> {
    let payload: KeycloakPayload;
    try {
      const resultat = await jwtVerify(token, this.jwks, {
        issuer: env.KEYCLOAK_ISSUER_URL,
        audience: env.KEYCLOAK_AUDIENCE,
        requiredClaims: ['exp', 'iat', 'sub'],
      });
      payload = resultat.payload as KeycloakPayload;
    } catch (erreur: unknown) {
      const detail =
        erreur instanceof Error ? erreur.message : 'erreur inconnue';
      let audienceRecue = 'indisponible';
      try {
        const claims = decodeJwt(token);
        audienceRecue = JSON.stringify(claims.aud ?? 'absente');
      } catch {
        // The signature validation error is already reported below.
      }
      this.logger.warn(`Échec de validation du token Keycloak : ${detail}`);
      throw new UnauthorizedException(
        env.NODE_ENV === 'development'
          ? `Le jeton OAuth est invalide : ${detail}. Audience reçue : ${audienceRecue}. Audience attendue : ${env.KEYCLOAK_AUDIENCE}.`
          : 'Le jeton OAuth est invalide.',
      );
    }

    const subject = this.validerTexte(payload.sub, 'subject');
    const email = this.validerEmail(payload.email);
    const nom = this.obtenirNom(payload, email);

    const existant = await this.prisma.utilisateur.findUnique({
      where: { oauthSubject: subject },
      select: {
        id: true,
        nom: true,
        email: true,
        photoPath: true,
        role: true,
        rolesAssignees: { select: { role: { select: { code: true } } } },
      },
    });
    if (existant !== null) {
      if (existant.email === null) {
        throw new ForbiddenException(
          "L'utilisateur OAuth associé n'a pas d'adresse email locale.",
        );
      }
      return {
        id: existant.id,
        nom: existant.nom,
        email: existant.email,
        role: existant.role,
        roles: existant.rolesAssignees.map(({ role }) => role.code),
        hasPhoto: existant.photoPath !== null,
      };
    }

    const preenregistre = await this.prisma.utilisateur.findUnique({
      where: { email },
      select: {
        id: true,
        nom: true,
        email: true,
        oauthSubject: true,
        photoPath: true,
        role: true,
        rolesAssignees: { select: { role: { select: { code: true } } } },
      },
    });
    if (preenregistre === null || preenregistre.oauthSubject !== null) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas préenregistré dans l'application.",
      );
    }

    const utilisateur = await this.prisma.utilisateur.update({
      where: { id: preenregistre.id },
      data: { oauthSubject: subject, nom },
      select: {
        id: true,
        nom: true,
        email: true,
        photoPath: true,
        role: true,
        rolesAssignees: { select: { role: { select: { code: true } } } },
      },
    });
    if (utilisateur.email === null) {
      throw new ForbiddenException(
        "L'utilisateur préenregistré n'a pas d'adresse email locale.",
      );
    }
    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
      roles: utilisateur.rolesAssignees.map(({ role }) => role.code),
      hasPhoto: utilisateur.photoPath !== null,
    };
  }

  private validerTexte(value: unknown, nom: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new UnauthorizedException(`Le claim OAuth ${nom} est absent.`);
    }
    return value.trim();
  }

  private validerEmail(value: unknown): string {
    const email = this.validerTexte(value, 'email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new UnauthorizedException('Le claim OAuth email est invalide.');
    }
    return email;
  }

  private obtenirNom(payload: KeycloakPayload, email: string): string {
    const nom = payload.name ?? payload.preferred_username;
    return typeof nom === 'string' && nom.trim() !== '' ? nom.trim() : email;
  }
}
