import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { RequeteAuthentifiee } from './auth.types.js';
import { KeycloakAuthGuard } from './keycloak-auth.guard.js';

@ApiTags('Authentification')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(KeycloakAuthGuard)
export class AuthController {
  @Get('me')
  @ApiOkResponse()
  @ApiOperation({ summary: "Retourner l'utilisateur connecté" })
  me(@Req() request: Request & RequeteAuthentifiee) {
    return request.user;
  }
}
