import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/prisma/prisma.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { DiscussionFactureController } from './discussion-facture.controller.js';
import { DiscussionFactureGateway } from './discussion-facture.gateway.js';
import { DiscussionFactureService } from './discussion-facture.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DiscussionFactureController],
  providers: [DiscussionFactureService, DiscussionFactureGateway],
})
export class DiscussionsModule {}
