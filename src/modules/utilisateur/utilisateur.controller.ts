import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleUtilisateur } from '../../generated/prisma/enums.js';
import {
  MessageResponseDto,
  UtilisateurReponseAvecMessageDto,
  UtilisateurResponseDto,
} from '../facturation/dtos/utilisateur-response.dto.js';
import {
  CreerUtilisateurDto,
  ModifierUtilisateurDto,
} from './dtos/utilisateur.dto.js';
import { ModifierPermissionDto } from './dtos/permission.dto.js';
import { CreerRoleDto, ModifierRoleDto } from './dtos/role.dto.js';
import { AdministrateurGuard } from './guards/administrateur.guard.js';
import { UtilisateurService } from './utilisateur.service.js';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard.js';

const ROLES_VALIDES = Object.values(RoleUtilisateur);
const VALIDATION_PAYLOAD = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('Utilisateurs')
@Controller('utilisateurs')
@UseGuards(KeycloakAuthGuard)
export class UtilisateurController {
  constructor(private readonly utilisateurs: UtilisateurService) {}

  @Get()
  @ApiOkResponse({ type: UtilisateurResponseDto, isArray: true })
  @ApiOperation({
    summary: 'Lister les utilisateurs',
    description:
      'Retourne les utilisateurs, avec un filtrage optionnel par rôle.',
  })
  lister(@Query('role') role?: string): Promise<UtilisateurResponseDto[]> {
    return this.utilisateurs.lister(this.validerRoles(role));
  }

  @Get('permissions/catalogue')
  @UseGuards(AdministrateurGuard)
  @ApiOkResponse()
  @ApiOperation({ summary: 'Lister le catalogue des permissions' })
  cataloguePermissions() {
    return this.utilisateurs.listerPermissions();
  }

  @Get('roles/catalogue')
  @UseGuards(AdministrateurGuard)
  @ApiOkResponse()
  @ApiOperation({ summary: 'Lister les rôles configurables' })
  catalogueRoles() {
    return this.utilisateurs.listerRoles();
  }

  @Post('roles')
  @UseGuards(AdministrateurGuard)
  @UsePipes(VALIDATION_PAYLOAD)
  creerRole(@Body() donnees: CreerRoleDto) {
    return this.utilisateurs.creerRole(donnees);
  }

  @Patch('roles/:id')
  @UseGuards(AdministrateurGuard)
  @UsePipes(VALIDATION_PAYLOAD)
  modifierRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() donnees: ModifierRoleDto,
  ) {
    return this.utilisateurs.modifierRole(id, donnees);
  }

  @Delete('roles/:id')
  @UseGuards(AdministrateurGuard)
  @HttpCode(HttpStatus.OK)
  async supprimerRole(@Param('id', ParseIntPipe) id: number) {
    await this.utilisateurs.supprimerRole(id);
    return { message: 'Le rôle a été supprimé avec succès.' };
  }

  @Get('roles/:id/permissions')
  @UseGuards(AdministrateurGuard)
  permissionsRole(@Param('id', ParseIntPipe) id: number) {
    return this.utilisateurs.obtenirPermissionsRole(id);
  }

  @Put('roles/:id/permissions/:code')
  @UseGuards(AdministrateurGuard)
  @UsePipes(VALIDATION_PAYLOAD)
  modifierPermissionRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
    @Body() donnees: ModifierPermissionDto,
  ) {
    return this.utilisateurs.modifierPermissionRole(id, code, donnees.autorisee);
  }

  @Delete('roles/:id/permissions/:code')
  @UseGuards(AdministrateurGuard)
  @HttpCode(HttpStatus.OK)
  async reinitialiserPermissionRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
  ) {
    await this.utilisateurs.reinitialiserPermissionRole(id, code);
    return { message: 'La permission par défaut du rôle a été restaurée.' };
  }

  @Get(':id')
  @ApiOkResponse({ type: UtilisateurResponseDto })
  @ApiOperation({
    summary: 'Consulter un utilisateur',
    description: 'Retourne le détail de l’utilisateur demandé.',
  })
  obtenir(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UtilisateurResponseDto> {
    return this.utilisateurs.obtenir(id);
  }

  @Post()
  @UseGuards(AdministrateurGuard)
  @ApiCreatedResponse({ type: UtilisateurReponseAvecMessageDto })
  @ApiOperation({
    summary: 'Créer un utilisateur',
    description: 'Crée un utilisateur avec ses informations et son rôle.',
  })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(VALIDATION_PAYLOAD)
  async creer(
    @Body() donnees: CreerUtilisateurDto,
  ): Promise<UtilisateurReponseAvecMessageDto> {
    return {
      message: "L'utilisateur a été créé avec succès.",
      utilisateur: await this.utilisateurs.creer(donnees),
    };
  }

  @Patch(':id')
  @UseGuards(AdministrateurGuard)
  @ApiOkResponse({ type: UtilisateurReponseAvecMessageDto })
  @ApiOperation({
    summary: 'Modifier un utilisateur',
    description: 'Met à jour les informations fournies pour un utilisateur.',
  })
  @UsePipes(VALIDATION_PAYLOAD)
  async modifier(
    @Param('id', ParseIntPipe) id: number,
    @Body() donnees: ModifierUtilisateurDto,
  ): Promise<UtilisateurReponseAvecMessageDto> {
    return {
      message: "L'utilisateur a été modifié avec succès.",
      utilisateur: await this.utilisateurs.modifier(id, donnees),
    };
  }

  @Delete(':id')
  @UseGuards(AdministrateurGuard)
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description:
      'Supprime définitivement un utilisateur qui n’est plus utilisé.',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponseDto })
  async supprimer(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MessageResponseDto> {
    await this.utilisateurs.supprimer(id);
    return { message: "L'utilisateur a été supprimé avec succès." };
  }

  @Get(':id/permissions')
  @UseGuards(AdministrateurGuard)
  @ApiOkResponse()
  @ApiOperation({
    summary: 'Lister les permissions effectives',
    description:
      'Retourne les permissions par défaut du rôle et les éventuelles exceptions.',
  })
  permissions(@Param('id', ParseIntPipe) id: number) {
    return this.utilisateurs.obtenirPermissions(id);
  }

  @Put(':id/permissions/:code')
  @UseGuards(AdministrateurGuard)
  @UsePipes(VALIDATION_PAYLOAD)
  @ApiOkResponse()
  @ApiOperation({
    summary: 'Définir une permission personnalisée',
    description: 'Crée ou remplace une exception au rôle par défaut.',
  })
  modifierPermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
    @Body() donnees: ModifierPermissionDto,
  ) {
    return this.utilisateurs.modifierPermission(id, code, donnees.autorisee);
  }

  @Delete(':id/permissions/:code')
  @UseGuards(AdministrateurGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({
    summary: 'Réinitialiser une permission',
    description: 'Supprime l’exception et restaure la valeur du rôle.',
  })
  async reinitialiserPermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
  ): Promise<MessageResponseDto> {
    await this.utilisateurs.reinitialiserPermission(id, code);
    return { message: 'La permission par défaut a été restaurée.' };
  }

  private validerRoles(role?: string): RoleUtilisateur[] | undefined {
    if (role === undefined) return undefined;
    const valeurs = role.split(',').map((valeur) => valeur.trim());
    if (
      valeurs.length === 0 ||
      valeurs.some(
        (valeur) => !ROLES_VALIDES.includes(valeur as RoleUtilisateur),
      )
    ) {
      throw new BadRequestException(
        'Le filtre role contient un rôle invalide.',
      );
    }
    return valeurs as RoleUtilisateur[];
  }
}
