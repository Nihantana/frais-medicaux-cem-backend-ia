import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { DiscussionFactureGateway } from './discussion-facture.gateway.js';

export type MessageDiscussionVue = {
  id: number;
  contenu: string;
  createdAt: Date;
  auteur: { id: number; nom: string };
};

export type DiscussionFactureVue = {
  factureGlobaleId: number;
  messages: MessageDiscussionVue[];
};

@Injectable()
export class DiscussionFactureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discussionTempsReel: DiscussionFactureGateway,
  ) {}

  async lire(factureGlobaleId: number): Promise<DiscussionFactureVue> {
    await this.verifierFacture(factureGlobaleId);
    const discussion = await this.prisma.discussionFacture.upsert({
      where: { factureGlobaleId },
      create: { factureGlobaleId },
      update: {},
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { auteur: { select: { id: true, nom: true } } } } },
    });
    return discussion;
  }

  async envoyer(
    factureGlobaleId: number,
    auteurId: number,
    contenu: string,
  ): Promise<MessageDiscussionVue> {
    await this.verifierFacture(factureGlobaleId);
    const texte = contenu.trim();
    const auteur = await this.prisma.utilisateur.findUnique({ where: { id: auteurId }, select: { id: true, nom: true } });
    if (!auteur) throw new NotFoundException('L’utilisateur connecté est introuvable.');

    const discussion = await this.prisma.discussionFacture.upsert({
      where: { factureGlobaleId },
      create: { factureGlobaleId },
      update: {},
      select: { id: true },
    });
    const message = await this.prisma.messageDiscussionFacture.create({
      data: { discussionId: discussion.id, auteurId, contenu: texte },
      include: { auteur: { select: { id: true, nom: true } } },
    });
    this.discussionTempsReel.publier(factureGlobaleId, message);
    return message;
  }

  private async verifierFacture(factureGlobaleId: number): Promise<void> {
    const facture = await this.prisma.factureGlobale.findUnique({ where: { id: factureGlobaleId }, select: { id: true } });
    if (!facture) throw new NotFoundException(`La facture ${factureGlobaleId} est introuvable.`);
  }
}
