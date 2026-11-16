import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditQueryDto } from './dtos/audit-query.dto.js';
import { KeycloakAdminService } from './keycloak-admin.service.js';

export interface AuditActionEvent {
  id: number;
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurEmail: string | null;
  methode: string;
  route: string;
  cibleId: string | null;
  statutHttp: number | null;
  resultat: 'SUCCES' | 'ECHEC';
  creeLe: Date;
  termineLe: Date | null;
}

interface AuditActor {
  id: number;
  nom?: string;
  email?: string;
}

interface AuditActionInput {
  actor: AuditActor;
  methode: string;
  route: string;
  cibleId: string | null;
}

@Injectable()
export class AuditService {
  private readonly actionEvents = new Subject<AuditActionEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  async startAction(input: AuditActionInput): Promise<number> {
    const actor =
      input.actor.nom !== undefined && input.actor.email !== undefined
        ? { nom: input.actor.nom, email: input.actor.email }
        : await this.prisma.utilisateur.findUnique({
            where: { id: input.actor.id },
            select: { nom: true, email: true },
          });

    if (actor === null) {
      throw new InternalServerErrorException(
        `Impossible d'enregistrer l'action : utilisateur ${input.actor.id} introuvable.`,
      );
    }

    const action = await this.prisma.journalAction.create({
      data: {
        utilisateurId: input.actor.id,
        utilisateurNom: actor.nom,
        utilisateurEmail: actor.email,
        methode: input.methode,
        route: input.route,
        cibleId: input.cibleId,
      },
      select: { id: true },
    });
    return action.id;
  }

  async finishAction(
    id: number,
    statutHttp: number,
    resultat: 'SUCCES' | 'ECHEC',
  ): Promise<void> {
    const action = await this.prisma.journalAction.update({
      where: { id },
      data: { statutHttp, resultat, termineLe: new Date() },
      select: {
        id: true,
        utilisateurId: true,
        utilisateurNom: true,
        utilisateurEmail: true,
        methode: true,
        route: true,
        cibleId: true,
        statutHttp: true,
        resultat: true,
        creeLe: true,
        termineLe: true,
      },
    });
    this.actionEvents.next({ ...action, resultat });
  }

  watchActions(): Observable<AuditActionEvent> {
    return this.actionEvents.asObservable();
  }

  async listActions(query: AuditQueryDto) {
    const q = query.q?.trim();
    const where = {
      ...(query.resultat ? { resultat: query.resultat } : {}),
      ...(q
        ? {
            OR: [
              { utilisateurNom: { contains: q, mode: 'insensitive' as const } },
              {
                utilisateurEmail: {
                  contains: q,
                  mode: 'insensitive' as const,
                },
              },
              { methode: { contains: q, mode: 'insensitive' as const } },
              { route: { contains: q, mode: 'insensitive' as const } },
              { cibleId: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [total, items] = await Promise.all([
      this.prisma.journalAction.count({ where }),
      this.prisma.journalAction.findMany({
        where,
        orderBy: [{ creeLe: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
        select: {
          id: true,
          utilisateurId: true,
          utilisateurNom: true,
          utilisateurEmail: true,
          methode: true,
          route: true,
          cibleId: true,
          statutHttp: true,
          resultat: true,
          creeLe: true,
          termineLe: true,
        },
      }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async listUserSessions() {
    const [users, sessions] = await Promise.all([
      this.prisma.utilisateur.findMany({
        orderBy: { nom: 'asc' },
        select: {
          id: true,
          nom: true,
          email: true,
          oauthSubject: true,
          role: true,
        },
      }),
      this.keycloakAdmin.listSessions(),
    ]);
    const sessionsByUser = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const userSessions = sessionsByUser.get(session.userId) ?? [];
      userSessions.push(session);
      sessionsByUser.set(session.userId, userSessions);
    }

    return users.map((user) => {
      const activeSessions =
        user.oauthSubject === null
          ? []
          : (sessionsByUser.get(user.oauthSubject) ?? []);
      const starts = activeSessions
        .map(({ start }) => start)
        .filter((timestamp): timestamp is number => timestamp !== null);
      const accesses = activeSessions
        .map(({ lastAccess }) => lastAccess)
        .filter((timestamp): timestamp is number => timestamp !== null);

      return {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        connecte: activeSessions.length > 0,
        nombreSessions: activeSessions.length,
        connecteDepuis:
          starts.length > 0 ? new Date(Math.min(...starts)) : null,
        derniereActivite:
          accesses.length > 0 ? new Date(Math.max(...accesses)) : null,
      };
    });
  }
}
