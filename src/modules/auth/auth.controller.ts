import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { RequeteAuthentifiee } from './auth.types.js';
import { KeycloakAuthGuard } from './keycloak-auth.guard.js';
import { ProfileService } from './profile.service.js';
import { ModifierProfilDto } from './dtos/modifier-profil.dto.js';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor.js';
import { createImageFilePipe } from '../../common/pipes/image-file.pipe.js';
import { extname } from 'node:path';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@ApiTags('Authentification')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(KeycloakAuthGuard)
export class AuthController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  @ApiOkResponse()
  @ApiOperation({ summary: "Retourner l'utilisateur connecté" })
  me(@Req() request: Request & RequeteAuthentifiee) {
    return request.user;
  }

  @Patch('me')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOkResponse()
  @ApiOperation({ summary: "Modifier le nom de l'utilisateur connecté" })
  modifierProfil(
    @Req() request: Request & RequeteAuthentifiee,
    @Body() donnees: ModifierProfilDto,
  ) {
    return this.profile.modifierNom(request.user!.id, donnees.nom);
  }

  @Patch('me/photo')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse()
  @ApiOperation({ summary: "Modifier la photo de l'utilisateur connecté" })
  @UseInterceptors(ImageUploadInterceptor('image'))
  modifierPhoto(
    @Req() request: Request & RequeteAuthentifiee,
    @UploadedFile(createImageFilePipe()) image: Express.Multer.File,
  ) {
    return this.profile.modifierPhoto(request.user!.id, image);
  }

  @Get('me/photo')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({
    description: 'Photo de profil diffusée en tant que fichier image.',
  })
  @ApiOperation({ summary: "Afficher la photo de l'utilisateur connecté" })
  async photo(
    @Req() request: Request & RequeteAuthentifiee,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const chemin = await this.profile.obtenirCheminPhoto(request.user!.id);
    const stream = await this.profile.ouvrirPhoto(chemin);
    if (stream === null) {
      throw new NotFoundException('La photo de profil est introuvable.');
    }

    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(stream, {
      type:
        MIME_BY_EXT[extname(chemin).toLowerCase()] ??
        'application/octet-stream',
    });
  }
}
