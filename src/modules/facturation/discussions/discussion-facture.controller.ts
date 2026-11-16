import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../../auth/keycloak-auth.guard.js';
import { obtenirUtilisateurId, type RequeteAvecUtilisateur } from '../shared/utilisateur-facture.js';
import { EnvoyerMessageDiscussionDto } from './discussion-facture.dto.js';
import { DiscussionFactureService, type DiscussionFactureVue, type MessageDiscussionVue } from './discussion-facture.service.js';

@Controller('factures/:factureId/discussion')
@ApiBearerAuth()
@UseGuards(KeycloakAuthGuard)
export class DiscussionFactureController {
  constructor(private readonly discussions: DiscussionFactureService) {}

  @Get()
  @ApiOkResponse()
  @ApiOperation({ summary: 'Lire la discussion d’une facture' })
  lire(@Param('factureId', ParseIntPipe) factureId: number): Promise<DiscussionFactureVue> {
    return this.discussions.lire(factureId);
  }

  @Post('messages')
  @ApiCreatedResponse()
  @ApiOperation({ summary: 'Envoyer un message dans la discussion d’une facture' })
  envoyer(
    @Param('factureId', ParseIntPipe) factureId: number,
    @Body() donnees: EnvoyerMessageDiscussionDto,
    @Req() requete: RequeteAvecUtilisateur,
  ): Promise<MessageDiscussionVue> {
    return this.discussions.envoyer(factureId, obtenirUtilisateurId(requete), donnees.contenu);
  }
}
