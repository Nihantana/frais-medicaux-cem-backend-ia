import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FactureRoleGuard } from '../shared/facture-role.guard.js';
import { RequireResourcePermissions } from '../../auth/authorization.decorators.js';
import {
  ConsommationT6QueryDto,
  RechercheMedicamentQueryDto,
} from '../dtos/consommation-t6.dto.js';
import {
  ConsommationT6ListResponseDto,
  BeneficiaireT6ValidationResponseDto,
  MedicamentRechercheResponseDto,
} from '../dtos/facture-response.dto.js';
import { ConsommationT6Service } from './consommation-t6.service.js';

const VALIDATION_PAYLOAD = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('Suivi des consommations T6')
@Controller('consommations-t6')
@UseGuards(FactureRoleGuard)
@RequireResourcePermissions('t6.read', 't6.write')
export class ConsommationT6Controller {
  constructor(private readonly consommations: ConsommationT6Service) {}

  @Get('beneficiaires/:idp')
  @ApiOkResponse({ type: BeneficiaireT6ValidationResponseDto })
  @ApiOperation({ summary: 'Vérifier un IDP avant la saisie d’une ligne T6' })
  verifierBeneficiaire(@Param('idp') idp: string) {
    return this.consommations.verifierBeneficiaire(idp);
  }

  @Get()
  @ApiOkResponse({ type: ConsommationT6ListResponseDto })
  @ApiOperation({ summary: 'Consulter les consommations enregistrées dans T6' })
  @UsePipes(VALIDATION_PAYLOAD)
  lister(@Query() query: ConsommationT6QueryDto) {
    return this.consommations.lister(query);
  }

  @Get('medicaments')
  @ApiOkResponse({ type: MedicamentRechercheResponseDto })
  @ApiOperation({
    summary: 'Rechercher un médicament dans la BDPM et le référentiel local',
  })
  @ApiQuery({ name: 'terme', required: true })
  @UsePipes(VALIDATION_PAYLOAD)
  rechercherMedicaments(@Query() query: RechercheMedicamentQueryDto) {
    return this.consommations.rechercherMedicaments(query.terme);
  }
}
