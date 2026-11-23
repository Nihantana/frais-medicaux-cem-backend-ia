import { BadRequestException, Body, Controller, Param, ParseIntPipe, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CloturerPaieDto } from '../../dtos/cloture-paie.dto.js';
import { CloturePaieResponseDto } from '../../dtos/paie-response.dto.js';
import { obtenirUtilisateurId } from '../../shared/utilisateur-facture.js';
import type { RequeteAvecUtilisateur } from '../../shared/utilisateur-facture.js';
import { CloturePaieService } from './cloture-paie.service.js';
import { RequirePermissions } from '../../../auth/authorization.decorators.js';

const VALIDATION_PAYLOAD = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

@ApiTags('Paies')
@Controller('factures')
@RequirePermissions('payroll.close')
export class CloturePaieController {
  constructor(private readonly cloturePaie: CloturePaieService) {}

  @Post(':id/cloture')
  @UsePipes(VALIDATION_PAYLOAD)
  @ApiOperation({
    summary: 'Clôturer une facture individuelle',
    description: 'Clôture définitivement la facture et ses lignes sans exiger le rapprochement T5/T6.',
  })
  @ApiParam({ name: 'id', example: 41, description: 'Identifiant de la facture' })
  @ApiCreatedResponse({ type: CloturePaieResponseDto })
  cloturer(
    @Param('id', ParseIntPipe) id: number,
    @Body() donnees: CloturerPaieDto,
    @Req() requete: RequeteAvecUtilisateur,
  ): Promise<CloturePaieResponseDto> {
    if (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(donnees.moisAffectation)) {
      throw new BadRequestException('Le mois d’affectation doit être au format AAAA-MM.');
    }
    return this.cloturePaie.cloturer(id, donnees.moisAffectation, donnees.dateCloture, obtenirUtilisateurId(requete));
  }
}
