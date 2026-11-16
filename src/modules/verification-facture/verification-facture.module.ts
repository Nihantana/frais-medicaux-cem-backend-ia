import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { VerificationFactureController } from './verification-facture.controller.js';
import { VerificationFactureOcrService } from './verification-facture.ocr.js';
import { VerificationFactureOllamaService } from './verification-facture.ollama.js';
import { VerificationFactureActesService } from './verification-facture.actes.js';
import { VerificationFactureService } from './verification-facture.service.js';
import { AssistantFactureService } from './assistant-facture.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AssistantGlobalController } from './assistant-global.controller.js';
import { AssistantGlobalService } from './assistant-global.service.js';

@Module({
  imports: [PrismaModule, StorageModule, AuthModule],
  controllers: [VerificationFactureController, AssistantGlobalController],
  providers: [
    VerificationFactureService,
    VerificationFactureOcrService,
    VerificationFactureOllamaService,
    VerificationFactureActesService,
    AssistantFactureService,
    AssistantGlobalService,
  ],
  exports: [VerificationFactureService],
})
export class VerificationFactureModule {}
