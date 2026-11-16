import { Module } from '@nestjs/common';
import { FacturationCoreModule } from '../facturation-core.module.js';
import { PrismaModule } from '../../../infrastructure/prisma/prisma.module.js';
import { FactureRoleGuard } from '../shared/facture-role.guard.js';
import { SuiviController } from './suivi.controller.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  imports: [FacturationCoreModule, PrismaModule, AuthModule],
  providers: [FactureRoleGuard],
  controllers: [SuiviController],
})
export class SuiviModule {}
