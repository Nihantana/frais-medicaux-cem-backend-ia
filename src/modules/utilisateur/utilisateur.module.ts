import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UtilisateurController } from './utilisateur.controller.js';
import { UtilisateurService } from './utilisateur.service.js';
import { AdministrateurGuard } from './guards/administrateur.guard.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UtilisateurController],
  providers: [UtilisateurService, AdministrateurGuard],
  exports: [UtilisateurService],
})
export class UtilisateurModule {}
