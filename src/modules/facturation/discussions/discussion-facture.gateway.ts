import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { KeycloakAuthService } from '../../auth/keycloak-auth.service.js';
import type { MessageDiscussionVue } from './discussion-facture.service.js';

type RejoindreDiscussion = { factureId: number };

@WebSocketGateway({ namespace: 'discussions', cors: { origin: true } })
export class DiscussionFactureGateway {
  private readonly logger = new Logger(DiscussionFactureGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly authentification: KeycloakAuthService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth.token;
    if (typeof token !== 'string' || token.trim() === '') {
      client.disconnect(true);
      return;
    }

    try {
      client.data.utilisateur = await this.authentification.authentifier(token);
    } catch {
      this.logger.warn(`Connexion discussion refusée (${client.id}).`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('discussion:rejoindre')
  rejoindre(
    @MessageBody() donnees: RejoindreDiscussion,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!Number.isSafeInteger(donnees?.factureId) || donnees.factureId <= 0) {
      return;
    }
    void client.join(this.salle(donnees.factureId));
  }

  publier(factureId: number, message: MessageDiscussionVue): void {
    this.server.to(this.salle(factureId)).emit('discussion:nouveau-message', message);
  }

  private salle(factureId: number): string {
    return `facture:${factureId}`;
  }
}
