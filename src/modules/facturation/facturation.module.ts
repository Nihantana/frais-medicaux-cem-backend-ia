import { Module } from '@nestjs/common';
import { FacturationCoreModule } from './facturation-core.module.js';
import { FacturesModule } from './factures/factures.module.js';
import { PiecesJointesModule } from './pieces-jointes/pieces-jointes.module.js';
import { SuiviModule } from './suivi/suivi.module.js';
import { VerificationFactureModule } from '../verification-facture/verification-facture.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { DiscussionsModule } from './discussions/discussions.module.js';

@Module({
  imports: [
    FacturationCoreModule,
    FacturesModule,
    SuiviModule,
    PiecesJointesModule,
    VerificationFactureModule,
    NotificationsModule,
    DiscussionsModule,
  ],
  exports: [FacturationCoreModule],
})
export class FacturationModule {}
