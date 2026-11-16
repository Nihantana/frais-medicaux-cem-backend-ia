import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { obtenirUtilisateurId } from '../shared/utilisateur-facture.js';
import type { RequeteAvecUtilisateur } from '../shared/utilisateur-facture.js';
import {
  NotificationFactureService,
  type NotificationFactureVue,
} from '../shared/notification-facture.service.js';

class NotificationResponseDto implements NotificationFactureVue {
  id!: number;
  factureGlobaleId!: number;
  mouvementId!: number;
  portee!: NotificationFactureVue['portee'];
  type!: NotificationFactureVue['type'];
  titre!: string;
  message!: string;
  luLe!: Date | null;
  createdAt!: Date;
  facture!: NotificationFactureVue['facture'];
}

@Controller('notifications')
export class NotificationFactureController {
  constructor(private readonly notifications: NotificationFactureService) {}

  @Get()
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  @ApiQuery({ name: 'nonLues', required: false, type: Boolean })
  @ApiOperation({ summary: 'Lister les notifications de l’utilisateur connecté' })
  lister(
    @Req() requete: RequeteAvecUtilisateur,
    @Query('nonLues') nonLues?: string,
  ): Promise<NotificationFactureVue[]> {
    return this.notifications.lister(
      obtenirUtilisateurId(requete),
      nonLues === 'true',
    );
  }

  @Get('non-lues/count')
  @ApiOkResponse({ schema: { type: 'object', properties: { count: { type: 'integer' } } } })
  @ApiOperation({ summary: 'Compter les notifications non lues' })
  async compterNonLues(@Req() requete: RequeteAvecUtilisateur): Promise<{ count: number }> {
    return { count: await this.notifications.compterNonLues(obtenirUtilisateurId(requete)) };
  }

  @Patch(':id/lue')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async marquerLue(
    @Param('id', ParseIntPipe) id: number,
    @Req() requete: RequeteAvecUtilisateur,
  ): Promise<void> {
    await this.notifications.marquerLue(obtenirUtilisateurId(requete), id);
  }

  @Patch('lues')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  async marquerToutesLues(@Req() requete: RequeteAvecUtilisateur): Promise<void> {
    await this.notifications.marquerToutesLues(obtenirUtilisateurId(requete));
  }
}
