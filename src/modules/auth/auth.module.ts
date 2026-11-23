import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { KeycloakAuthGuard } from './keycloak-auth.guard.js';
import { KeycloakAuthService } from './keycloak-auth.service.js';
import { AuthorizationService } from './authorization.service.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RolesGuard } from './roles.guard.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [AuthController],
  providers: [
    ProfileService,
    KeycloakAuthService,
    KeycloakAuthGuard,
    AuthorizationService,
    PermissionsGuard,
    { provide: APP_GUARD, useExisting: PermissionsGuard },
    RolesGuard,
  ],
  exports: [
    KeycloakAuthGuard,
    KeycloakAuthService,
    AuthorizationService,
    PermissionsGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
