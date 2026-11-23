import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard.js';
import { obtenirUtilisateurId } from '../facturation/shared/utilisateur-facture.js';
import type { RequeteAvecUtilisateur } from '../facturation/shared/utilisateur-facture.js';
import {
  RapportControleVisuelResponseDto,
  RetourControleVisuelDto,
} from './dtos/verification-facture-response.dto.js';
import {
  QuestionAssistantFactureDto,
  ReponseAssistantFactureDto,
} from './dtos/assistant-facture.dto.js';
import { AssistantFactureService } from './assistant-facture.service.js';
import { VerificationFactureService } from './verification-facture.service.js';
import { RequirePermissions } from '../auth/authorization.decorators.js';

@ApiTags('Vérification des factures')
@Controller('factures/:id/controle-visuel')
@RequirePermissions('verification.use')
export class VerificationFactureController {
  constructor(
    private readonly verification: VerificationFactureService,
    private readonly assistant: AssistantFactureService,
  ) {}

  @Post('assistant')
  @UseGuards(KeycloakAuthGuard)
  @ApiCreatedResponse({ type: ReponseAssistantFactureDto })
  @ApiOperation({
    summary: 'Poser une question à l’assistant de facture',
    description:
      'Répond à partir des données de la facture et du dernier rapport de contrôle visuel. L’assistant ne prend aucune décision métier.',
  })
  async questionner(
    @Param('id', ParseIntPipe) factureId: number,
    @Body() donnees: QuestionAssistantFactureDto,
  ): Promise<ReponseAssistantFactureDto> {
    return this.assistant.repondre(factureId, donnees.question);
  }

  @Post()
  @ApiCreatedResponse({ type: RapportControleVisuelResponseDto })
  @ApiNotFoundResponse({ description: 'Facture ou pièce jointe introuvable.' })
  @ApiResponse({
    status: 502,
    description: 'Ollama a retourné une réponse invalide.',
  })
  @ApiResponse({
    status: 503,
    description: 'Tesseract ou Ollama est indisponible.',
  })
  @ApiOperation({
    summary: 'Lancer le contrôle visuel assisté',
    description:
      'Extrait les données des pièces jointes, applique les contrôles déterministes et conserve le rapport. La décision humaine reste nécessaire.',
  })
  async lancer(
    @Param('id', ParseIntPipe) factureId: number,
    @Req() requete: RequeteAvecUtilisateur,
  ): Promise<RapportControleVisuelResponseDto> {
    return this.verification.lancer(factureId, obtenirUtilisateurId(requete));
  }

  @Get()
  @ApiOkResponse({ type: RapportControleVisuelResponseDto })
  @ApiNotFoundResponse({
    description: 'Facture ou contrôle visuel introuvable.',
  })
  @ApiOperation({ summary: 'Consulter le dernier contrôle visuel' })
  async obtenir(
    @Param('id', ParseIntPipe) factureId: number,
  ): Promise<RapportControleVisuelResponseDto> {
    return this.verification.obtenir(factureId);
  }

  @Post('confirmation')
  @ApiCreatedResponse({ type: RapportControleVisuelResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Le contrôle contient une anomalie ou est encore en cours.',
  })
  @ApiOperation({
    summary: 'Confirmer manuellement le contrôle visuel',
    description:
      'Autorise le traitement ultérieur de la facture après examen humain du rapport.',
  })
  async confirmer(
    @Param('id', ParseIntPipe) factureId: number,
    @Req() requete: RequeteAvecUtilisateur,
  ): Promise<RapportControleVisuelResponseDto> {
    return this.verification.confirmer(
      factureId,
      obtenirUtilisateurId(requete),
    );
  }

  @Post('retour')
  @ApiCreatedResponse({ type: RapportControleVisuelResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Le statut actuel de la facture ne permet pas son retour.',
  })
  @ApiOperation({
    summary: 'Retourner la facture au prestataire',
    description:
      'Passe la facture à RETOURNEE et conserve le motif dans le mouvement de workflow.',
  })
  async retourner(
    @Param('id', ParseIntPipe) factureId: number,
    @Body() donnees: RetourControleVisuelDto,
    @Req() requete: RequeteAvecUtilisateur,
  ): Promise<RapportControleVisuelResponseDto> {
    return this.verification.retourner(
      factureId,
      obtenirUtilisateurId(requete),
      donnees.remarque,
    );
  }
}
