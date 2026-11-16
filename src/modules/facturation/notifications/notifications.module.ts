import { Module } from '@nestjs/common';
import { FacturationCoreModule } from '../facturation-core.module.js';
import { NotificationFactureController } from './notification-facture.controller.js';

@Module({
  imports: [FacturationCoreModule],
  controllers: [NotificationFactureController],
})
export class NotificationsModule {}
