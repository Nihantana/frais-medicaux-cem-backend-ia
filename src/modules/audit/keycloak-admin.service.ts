import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { env } from '../../common/settings/env.validator.js';

const PAGE_SIZE = 100;
const MAX_SESSIONS = 5000;
const REQUEST_TIMEOUT_MS = 10000;

interface KeycloakSession {
  userId: string;
  start: number | null;
  lastAccess: number | null;
}

interface KeycloakTokenResponse {
  access_token?: unknown;
}

interface KeycloakClientRepresentation {
  id?: unknown;
  clientId?: unknown;
}

@Injectable()
export class KeycloakAdminService {
  async listSessions(): Promise<KeycloakSession[]> {
    const token = await this.getAccessToken();
    const { adminRealmUrl } = this.getRealmUrls();
    const clientUuid = await this.getApplicationClientUuid(
      token,
      adminRealmUrl,
    );
    const sessionsUrl = new URL(
      `${adminRealmUrl.pathname}/clients/${encodeURIComponent(clientUuid)}/user-sessions`,
      adminRealmUrl.origin,
    );
    const sessions: KeycloakSession[] = [];

    for (let first = 0; first < MAX_SESSIONS; first += PAGE_SIZE) {
      const url = new URL(sessionsUrl);
      url.searchParams.set('first', String(first));
      url.searchParams.set('max', String(PAGE_SIZE));

      const response = await this.request(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(
          response.status === 401
            ? "Keycloak refuse le jeton pour l'API admin; vérifier le scope de client kc-admin-api."
            : response.status === 403
              ? "Le compte de service Keycloak n'a pas le droit de consulter les sessions (rôles view-users et view-clients requis)."
              : `Keycloak n'a pas pu fournir les sessions (HTTP ${response.status}).`,
        );
      }

      const page = await this.parseSessions(response);
      sessions.push(...page);
      if (page.length < PAGE_SIZE) return sessions;
    }

    throw new ServiceUnavailableException(
      `Plus de ${MAX_SESSIONS} sessions Keycloak correspondent à l'application; la liste est refusée pour éviter un statut incomplet.`,
    );
  }

  private async getAccessToken(): Promise<string> {
    if (
      env.KEYCLOAK_ADMIN_CLIENT_ID.trim() === '' ||
      env.KEYCLOAK_ADMIN_CLIENT_SECRET.trim() === ''
    ) {
      throw new ServiceUnavailableException(
        'La consultation des sessions Keycloak nécessite KEYCLOAK_ADMIN_CLIENT_ID et KEYCLOAK_ADMIN_CLIENT_SECRET.',
      );
    }

    const { tokenUrl } = this.getRealmUrls();
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.KEYCLOAK_ADMIN_CLIENT_ID,
      client_secret: env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      scope: 'kc-admin-api',
    });
    const response = await this.request(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        response.status === 400
          ? 'Keycloak refuse le scope kc-admin-api. Associez ce scope client au client de service.'
          : response.status === 401
            ? "Keycloak refuse l'authentification du client de service; vérifiez son ID, son secret et le realm."
            : `L'authentification du compte de service Keycloak a échoué (HTTP ${response.status}).`,
      );
    }

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) {
      throw new BadGatewayException(
        'Keycloak a retourné une réponse de jeton invalide.',
      );
    }

    const accessToken = (payload as KeycloakTokenResponse).access_token;
    if (typeof accessToken !== 'string') {
      throw new BadGatewayException(
        'Keycloak a retourné une réponse de jeton invalide.',
      );
    }
    return accessToken;
  }

  private async getApplicationClientUuid(
    token: string,
    adminRealmUrl: URL,
  ): Promise<string> {
    const clientsUrl = new URL(
      `${adminRealmUrl.pathname}/clients`,
      adminRealmUrl.origin,
    );
    clientsUrl.searchParams.set('clientId', env.KEYCLOAK_AUDIENCE);
    const response = await this.request(clientsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        response.status === 403
          ? "Le compte de service Keycloak ne peut pas consulter le client de l'application (rôle query-clients requis)."
          : response.status === 401
            ? "Keycloak refuse le jeton pour l'API admin; vérifier le scope de client kc-admin-api."
            : `Keycloak n'a pas pu fournir le client de l'application (HTTP ${response.status}).`,
      );
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new BadGatewayException(
        'Keycloak a retourné une liste de clients invalide.',
      );
    }
    const matches = payload.filter(
      (client: unknown): client is KeycloakClientRepresentation =>
        typeof client === 'object' &&
        client !== null &&
        'id' in client &&
        typeof client.id === 'string' &&
        'clientId' in client &&
        client.clientId === env.KEYCLOAK_AUDIENCE,
    );
    if (matches.length !== 1 || typeof matches[0]?.id !== 'string') {
      throw new ServiceUnavailableException(
        `Le client Keycloak ${env.KEYCLOAK_AUDIENCE} est introuvable ou ambigu.`,
      );
    }
    return matches[0].id;
  }

  private getRealmUrls(): { tokenUrl: URL; adminRealmUrl: URL } {
    let issuer: URL;
    try {
      issuer = new URL(env.KEYCLOAK_ISSUER_URL);
    } catch {
      throw new ServiceUnavailableException(
        "L'URL de l'émetteur Keycloak est invalide.",
      );
    }

    const match = issuer.pathname.match(/^(.*)\/realms\/([^/]+)\/?$/);
    if (!match) {
      throw new ServiceUnavailableException(
        'KEYCLOAK_ISSUER_URL doit se terminer par /realms/{realm}.',
      );
    }

    const basePath = match[1];
    const realm = encodeURIComponent(decodeURIComponent(match[2]));
    return {
      tokenUrl: new URL(
        `${basePath}/realms/${realm}/protocol/openid-connect/token`,
        issuer.origin,
      ),
      adminRealmUrl: new URL(
        `${basePath}/admin/realms/${realm}`,
        issuer.origin,
      ),
    };
  }

  private async request(url: URL, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Keycloak est inaccessible ou ne répond pas dans le délai imparti.',
      );
    }
  }

  private async parseSessions(response: Response): Promise<KeycloakSession[]> {
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new BadGatewayException(
        'Keycloak a retourné une liste de sessions invalide.',
      );
    }

    return payload.map((value: unknown) => {
      if (
        typeof value !== 'object' ||
        value === null ||
        !('userId' in value) ||
        typeof value.userId !== 'string'
      ) {
        throw new BadGatewayException(
          'Une session Keycloak ne contient pas les informations attendues.',
        );
      }

      return {
        userId: value.userId,
        start: 'start' in value ? this.toTimestamp(value.start) : null,
        lastAccess:
          'lastAccess' in value ? this.toTimestamp(value.lastAccess) : null,
      };
    });
  }

  private toTimestamp(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
