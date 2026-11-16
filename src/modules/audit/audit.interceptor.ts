import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, from, mergeMap } from 'rxjs';
import type { RequeteAuthentifiee } from '../auth/auth.types.js';
import { shouldAuditMethod } from './audit-method.js';
import { AuditService } from './audit.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & RequeteAuthentifiee>();
    const actor = request.user;
    if (!shouldAuditMethod(request.method) || actor === undefined) {
      return next.handle();
    }

    const routePath = request.route?.path;
    const route =
      typeof routePath === 'string'
        ? `${request.baseUrl}${routePath}`
        : request.baseUrl || 'route-inconnue';
    const targetId =
      typeof request.params.id === 'string' ? request.params.id : null;
    const response = http.getResponse<Response>();

    return from(
      this.audit.startAction({
        actor,
        methode: request.method.toUpperCase(),
        route,
        cibleId: targetId,
      }),
    ).pipe(
      mergeMap((actionId) =>
        next.handle().pipe(
          mergeMap(async (result) => {
            const status = response.statusCode;
            try {
              await this.audit.finishAction(
                actionId,
                status,
                status < 400 ? 'SUCCES' : 'ECHEC',
              );
            } catch (error) {
              this.logger.error(
                `Impossible de finaliser le journal d'action ${actionId}.`,
                error instanceof Error ? error.stack : undefined,
              );
            }
            return result;
          }),
          catchError((error: unknown) =>
            from(
              this.finalizeFailedAction(
                actionId,
                error instanceof HttpException ? error.getStatus() : 500,
                error,
              ),
            ),
          ),
        ),
      ),
    );
  }

  private async finalizeFailedAction(
    actionId: number,
    status: number,
    originalError: unknown,
  ): Promise<never> {
    try {
      await this.audit.finishAction(actionId, status, 'ECHEC');
    } catch (auditError) {
      this.logger.error(
        `Impossible de finaliser le journal d'action ${actionId}.`,
        auditError instanceof Error ? auditError.stack : undefined,
      );
    }
    throw originalError;
  }
}
