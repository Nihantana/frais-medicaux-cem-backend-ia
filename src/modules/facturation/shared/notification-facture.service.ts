import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  MouvementFacture,
  Prisma,
} from '../../../generated/prisma/client.js';
import {
  PorteeNotification,
  TypeMouvement,
  TypeNotification,
} from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

const TYPES_NOTIFIABLES = new Set<TypeMouvement>([
  TypeMouvement.ENVOI_VALIDATION,
  TypeMouvement.RETOUR_POUR_CORRECTION,
  TypeMouvement.RETOUR_PRESTATAIRE,
  TypeMouvement.RECEPTION_APRES_MODIFICATION,
  TypeMouvement.VALIDATION,
  TypeMouvement.SORTIE,
  TypeMouvement.DEMANDE_SUPPRESSION,
]);

type ClientTransaction = Prisma.TransactionClient;

export type NotificationFactureVue = {
  id: number;
  factureGlobaleId: number;
  mouvementId: number;
  portee: PorteeNotification;
  type: TypeNotification;
  titre: string;
  message: string;
  luLe: Date | null;
  createdAt: Date;
  facture: { refSociale: string; statut: string };
};

@Injectable()
export class NotificationFactureService {
  constructor(private readonly prisma: PrismaService) {}

  async creerPourMouvement(
    tx: ClientTransaction,
    mouvement: MouvementFacture,
  ): Promise<void> {
    if (!TYPES_NOTIFIABLES.has(mouvement.type)) return;

    const facture = await tx.factureGlobale.findUnique({
      where: { id: mouvement.factureGlobaleId },
      select: { id: true, refSociale: true, statut: true },
    });
    if (facture === null) return;

    const type = mouvement.type as TypeNotification;
    const contenu = contenuNotification(type, facture.refSociale);
    const portee = mouvement.adresseAId === null
      ? PorteeNotification.GLOBALE
      : PorteeNotification.INDIVIDUELLE;
    const utilisateurs = mouvement.adresseAId === null
      ? await tx.utilisateur.findMany({
          where: { id: { not: mouvement.effectueParId } },
          select: { id: true },
        })
      : [{ id: mouvement.adresseAId }];

    if (utilisateurs.length === 0) return;

    await tx.notification.createMany({
      data: utilisateurs.map(({ id }) => ({
        utilisateurId: id,
        factureGlobaleId: facture.id,
        mouvementId: mouvement.id,
        portee,
        type,
        titre: contenu.titre,
        message: contenu.message,
      })),
      skipDuplicates: true,
    });
  }

  async lister(utilisateurId: number, nonLuesSeulement = false): Promise<NotificationFactureVue[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        utilisateurId,
        ...(nonLuesSeulement ? { luLe: null } : {}),
      },
      include: {
        factureGlobale: { select: { refSociale: true, statut: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return notifications.map(({ factureGlobale, ...notification }) => ({
      ...notification,
      facture: factureGlobale,
    }));
  }

  async compterNonLues(utilisateurId: number): Promise<number> {
    return this.prisma.notification.count({ where: { utilisateurId, luLe: null } });
  }

  async marquerLue(utilisateurId: number, id: number): Promise<void> {
    const resultat = await this.prisma.notification.updateMany({
      where: { id, utilisateurId },
      data: { luLe: new Date() },
    });
    if (resultat.count === 0) {
      throw new NotFoundException('La notification est introuvable.');
    }
  }

  async marquerToutesLues(utilisateurId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { utilisateurId, luLe: null },
      data: { luLe: new Date() },
    });
  }
}

function contenuNotification(type: TypeNotification, refSociale: string): {
  titre: string;
  message: string;
} {
  const contenus: Record<TypeNotification, { titre: string; message: string }> = {
    ENVOI_VALIDATION: {
      titre: 'Facture à valider',
      message: `La facture ${refSociale} vous est adressée pour validation.`,
    },
    RETOUR_POUR_CORRECTION: {
      titre: 'Facture à corriger',
      message: `La facture ${refSociale} nécessite une correction.`,
    },
    RETOUR_PRESTATAIRE: {
      titre: 'Retour de facture',
      message: `La facture ${refSociale} a été retournée au prestataire.`,
    },
    RECEPTION_APRES_MODIFICATION: {
      titre: 'Correction reçue',
      message: `La facture ${refSociale} a reçu une modification.`,
    },
    VALIDATION: {
      titre: 'Facture validée',
      message: `La facture ${refSociale} a été validée.`,
    },
    SORTIE: {
      titre: 'Facture sortie',
      message: `La facture ${refSociale} a été enregistrée comme sortie.`,
    },
    DEMANDE_SUPPRESSION: {
      titre: 'Suppression demandée',
      message: `La suppression de la facture ${refSociale} est demandée.`,
    },
  };
  return contenus[type];
}
