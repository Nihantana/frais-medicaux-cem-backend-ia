import {
  Controller,
  Get,
  MessageEvent,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { interval, map, merge, Observable } from 'rxjs';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard.js';
import { AdministrateurGuard } from '../utilisateur/guards/administrateur.guard.js';
import { AuditQueryDto } from './dtos/audit-query.dto.js';
import { AuditService } from './audit.service.js';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(KeycloakAuthGuard, AdministrateurGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('actions')
  @ApiOkResponse()
  @ApiOperation({
    summary: 'Consulter le journal des actions',
    description:
      'Retourne les écritures authentifiées, sans corps ni paramètres de requête.',
  })
  listActions(@Query() query: AuditQueryDto) {
    return this.audit.listActions(query);
  }

  @Sse('actions/stream')
  streamActions(): Observable<MessageEvent> {
    return merge(
      this.audit.watchActions().pipe(
        map((action) => ({
          id: String(action.id),
          type: 'audit-action',
          data: action,
        })),
      ),
      interval(20_000).pipe(
        map(() => ({ type: 'heartbeat', data: { timestamp: Date.now() } })),
      ),
    );
  }

  @Get('sessions')
  @ApiOkResponse()
  @ApiOperation({
    summary: 'Consulter les sessions Keycloak',
    description:
      'Retourne les utilisateurs locaux et leur statut de session active pour le client de l’application.',
  })
  listSessions() {
    return this.audit.listUserSessions();
  }
}
