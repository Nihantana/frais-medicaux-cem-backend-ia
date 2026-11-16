import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { VerificationFactureOllamaService } from './verification-facture.ollama.js';
import type { ReponseAssistantFactureDto } from './dtos/assistant-facture.dto.js';
import { DOCUMENTATION_SYSTEME_ASSISTANT } from './assistant-facture.documentation.js';

@Injectable()
export class AssistantGlobalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: VerificationFactureOllamaService,
  ) {}

  async repondre(question: string): Promise<ReponseAssistantFactureDto> {
    const factures = await this.prisma.factureGlobale.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        refSociale: true,
        numFacture: true,
        statut: true,
        montantTotal: true,
        total100Cem: true,
        totalDepassement: true,
        dateReception: true,
        updatedAt: true,
        prestataire: { select: { nom: true } },
        _count: { select: { lignes: true, piecesJointes: true } },
        controleVisuel: { select: { statut: true, score: true } },
        mouvements: {
          orderBy: { date: 'asc' },
          take: 20,
          select: {
            id: true,
            type: true,
            date: true,
            remarque: true,
            service: true,
            effectuePar: { select: { id: true, nom: true, role: true } },
            adresseA: { select: { id: true, nom: true, role: true } },
          },
        },
      },
    });

    const parStatut = factures.reduce<Record<string, number>>((acc, facture) => {
      acc[facture.statut] = (acc[facture.statut] ?? 0) + 1;
      return acc;
    }, {});
    const contexte = JSON.stringify({
      documentationSysteme: DOCUMENTATION_SYSTEME_ASSISTANT,
      limites: { nombreFacturesFournies: factures.length, maximum: 200 },
      synthese: {
        nombreFactures: factures.length,
        parStatut,
        nombreAvecControleVisuel: factures.filter((facture) => facture.controleVisuel !== null).length,
        nombreSansLigneT6: factures.filter((facture) => facture._count.lignes === 0).length,
      },
      factures: factures.map((facture) => ({
        id: facture.id,
        referenceSociale: facture.refSociale,
        numero: facture.numFacture,
        prestataire: facture.prestataire.nom,
        statut: facture.statut,
        montantTotal: facture.montantTotal?.toString() ?? null,
        montantCem: facture.total100Cem.toString(),
        depassement: facture.totalDepassement.toString(),
        dateReception: facture.dateReception.toISOString().slice(0, 10),
        nombreLignesT6: facture._count.lignes,
        nombrePiecesJointes: facture._count.piecesJointes,
        historiqueMouvements: facture.mouvements.map((mouvement) => ({
          id: mouvement.id,
          type: mouvement.type,
          date: mouvement.date.toISOString(),
          remarque: mouvement.remarque,
          service: mouvement.service,
          effectuePar: mouvement.effectuePar,
          adresseA: mouvement.adresseA,
        })),
        controleVisuel: facture.controleVisuel
          ? { statut: facture.controleVisuel.statut, score: facture.controleVisuel.score?.toString() ?? null }
          : null,
      })),
    });

    return {
      reponse: await this.ollama.repondre(question.trim(), contexte),
      sources: ['Documentation du système', 'Synthèse des factures', 'Factures récentes (maximum 200)'],
      avertissement: 'Cet assistant fournit une aide globale. Il ne valide, ne modifie et ne remplace jamais la décision d’un agent.',
    };
  }
}
