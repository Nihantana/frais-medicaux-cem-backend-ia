import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { VerificationFactureOllamaService } from './verification-facture.ollama.js';
import type { ReponseAssistantFactureDto } from './dtos/assistant-facture.dto.js';
import { selectionnerDocumentationAssistant } from './assistant-facture.documentation.js';

const FACTURES_RECENTES_LIMITE = 10;
const FACTURES_CANDIDATES_LIMITE = 2;
const FACTURES_CIBLEES_LIMITE = 1;
const MOUVEMENTS_CIBLE_LIMITE = 10;
const LIGNES_CIBLEES_LIMITE = 20;

const AVERTISSEMENT =
  'Cet assistant fournit une aide informative. Il ne valide, ne modifie et ne remplace jamais la décision d’un agent.';

@Injectable()
export class AssistantGlobalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: VerificationFactureOllamaService,
  ) {}

  async repondre(question: string): Promise<ReponseAssistantFactureDto> {
    const questionNettoyee = question.trim();
    const reponseConversationnelle =
      this.repondreAuMessageSimple(questionNettoyee);
    if (reponseConversationnelle !== null) {
      return {
        reponse: reponseConversationnelle,
        sources: [],
        avertissement: AVERTISSEMENT,
      };
    }

    const documentation = selectionnerDocumentationAssistant(questionNettoyee);
    const identifiants = this.extraireIdentifiantsFacture(questionNettoyee);
    if (
      identifiants.length === 0 &&
      /\b(historique|mouvements?|cette facture|facture concernee)\b/i.test(
        this.normaliser(questionNettoyee),
      )
    ) {
      return {
        reponse:
          'Pour consulter une facture précise, indiquez son numéro ou sa référence sociale.',
        sources: ['Documentation métier'],
        avertissement: AVERTISSEMENT,
      };
    }

    if (identifiants.length > 0) {
      const factures = await this.prisma.factureGlobale.findMany({
        where: {
          OR: identifiants.flatMap((identifiant) => [
            {
              numFacture: {
                contains: identifiant,
                mode: 'insensitive' as const,
              },
            },
            {
              refSociale: {
                contains: identifiant,
                mode: 'insensitive' as const,
              },
            },
          ]),
        },
        orderBy: { updatedAt: 'desc' },
        take: FACTURES_CANDIDATES_LIMITE,
        select: {
          id: true,
          refSociale: true,
          numFacture: true,
          dateFacture: true,
          dateReception: true,
          dateValidation: true,
          moisPrestation: true,
          moisPaie: true,
          dateCloture: true,
          statut: true,
          montantTotal: true,
          total100Cem: true,
          totalDepassement: true,
          montant80Cem: true,
          montant20Agent: true,
          totalChargeAgent: true,
          prestataire: { select: { nom: true } },
          _count: {
            select: { lignes: true, piecesJointes: true, mouvements: true },
          },
          controleVisuel: { select: { statut: true, score: true } },
          lignes: {
            orderBy: { numLigne: 'asc' },
            take: LIGNES_CIBLEES_LIMITE,
            select: {
              numLigne: true,
              libelle: true,
              dateActe: true,
              beneficiaireId: true,
              montantActe: true,
              montantCemIntegral: true,
              montantDepassementActe: true,
              montantDepassementPlafond: true,
              tauxCem: true,
              refPaie: true,
              moisAffectation: true,
            },
          },
          mouvements: {
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: MOUVEMENTS_CIBLE_LIMITE,
            select: {
              type: true,
              date: true,
              remarque: true,
              service: true,
              effectuePar: { select: { nom: true } },
              adresseA: { select: { nom: true } },
            },
          },
        },
      });

      if (factures.length === 0) {
        return {
          reponse: `Aucune facture ne correspond à la référence « ${identifiants.join(', ')} ». Vérifiez le numéro ou la référence sociale.`,
          sources: ['Recherche dans les factures'],
          avertissement: AVERTISSEMENT,
        };
      }
      if (factures.length > 1) {
        return {
          reponse:
            'Plusieurs factures correspondent à cette référence. Précisez le numéro complet ou la référence sociale.',
          sources: ['Recherche dans les factures'],
          avertissement: AVERTISSEMENT,
        };
      }

      return {
        reponse: await this.ollama.repondre(
          questionNettoyee,
          JSON.stringify({
            documentationMetier: documentation,
            limites: {
              nombreFacturesFournies: factures.length,
              maximumFactures: FACTURES_CIBLEES_LIMITE,
              maximumMouvementsParFacture: MOUVEMENTS_CIBLE_LIMITE,
              maximumLignesParFacture: LIGNES_CIBLEES_LIMITE,
            },
            factures: factures.map(({ mouvements, ...facture }) => ({
              ...facture,
              mouvements: [...mouvements].reverse(),
            })),
          }),
        ),
        sources: [
          'Documentation métier',
          'Facture(s) correspondant à la référence',
        ],
        avertissement: AVERTISSEMENT,
      };
    }

    const contexte = await this.construireContexteGlobal(documentation);
    return {
      reponse: await this.ollama.repondre(
        questionNettoyee,
        JSON.stringify(contexte),
      ),
      sources: [
        'Documentation métier',
        'Synthèse de toutes les factures',
        `Factures récentes (maximum ${FACTURES_RECENTES_LIMITE})`,
      ],
      avertissement: AVERTISSEMENT,
    };
  }

  private repondreAuMessageSimple(question: string): string | null {
    const normalisee = this.normaliser(question)
      .replace(/[.!?,;:]+$/g, '')
      .trim();
    if (
      /^(bonjour|bonsoir|salut|hello|hi|coucou)(?:\s+(ca va|comment allez vous|comment vas tu))?$/.test(
        normalisee,
      )
    ) {
      return 'Bonjour ! Je peux vous aider sur les factures, leur historique, les lignes T6, le suivi T5 et les contrôles. Pour une facture précise, indiquez son numéro ou sa référence sociale.';
    }
    if (/^(merci|merci beaucoup|au revoir|a bientot|bye)$/.test(normalisee)) {
      return 'Avec plaisir. Je reste disponible pour vos questions sur les frais médicaux et le traitement des factures.';
    }
    return null;
  }

  private extraireIdentifiantsFacture(question: string): string[] {
    const expression =
      /\b(?:factures?(?:\s+(?:n(?:um[eé]ro)?\s*[°o]?\s*)?)?|num[eé]ro|n[°o]|r[eé]f(?:[eé]rence)?(?:\s+sociale)?)\s*[:#-]?\s*([a-z0-9][a-z0-9/-]{2,})/giu;
    const identifiants = Array.from(
      question.matchAll(expression),
      (correspondance) => correspondance[1]?.trim(),
    ).filter((identifiant): identifiant is string =>
      Boolean(identifiant && /\d/.test(identifiant)),
    );
    return [...new Set(identifiants)];
  }

  private async construireContexteGlobal(documentation: string) {
    const [
      total,
      parStatut,
      sansLigneT6,
      montants,
      controlesParStatut,
      recentes,
    ] = await Promise.all([
      this.prisma.factureGlobale.count(),
      this.prisma.factureGlobale.groupBy({
        by: ['statut'],
        _count: { _all: true },
      }),
      this.prisma.factureGlobale.count({
        where: { lignes: { none: {} } },
      }),
      this.prisma.factureGlobale.aggregate({
        _sum: {
          montantTotal: true,
          total100Cem: true,
          totalDepassement: true,
        },
      }),
      this.prisma.controleVisuelFacture.groupBy({
        by: ['statut'],
        _count: { _all: true },
      }),
      this.prisma.factureGlobale.findMany({
        orderBy: { updatedAt: 'desc' },
        take: FACTURES_RECENTES_LIMITE,
        select: {
          refSociale: true,
          numFacture: true,
          dateFacture: true,
          dateReception: true,
          statut: true,
          montantTotal: true,
          total100Cem: true,
          totalDepassement: true,
          prestataire: { select: { nom: true } },
          _count: { select: { lignes: true, piecesJointes: true } },
          controleVisuel: { select: { statut: true, score: true } },
        },
      }),
    ]);

    return {
      documentationMetier: documentation,
      limites: {
        totalExactSurTouteLaBase: total,
        agregatsTousStatuts: true,
        listeDetailleeLimiteeAuxFacturesRecentes: FACTURES_RECENTES_LIMITE,
        lesFacturesRecentesNeSontPasUneListeExhaustive: true,
      },
      synthese: {
        nombreFactures: total,
        facturesParStatut: Object.fromEntries(
          parStatut.map(({ statut, _count }) => [statut, _count._all]),
        ),
        facturesSansLigneT6: sansLigneT6,
        montantsTotaux: {
          montantFactures: montants._sum.montantTotal?.toString() ?? null,
          priseEnChargeCem: montants._sum.total100Cem?.toString() ?? '0',
          depassements: montants._sum.totalDepassement?.toString() ?? '0',
        },
        controlesVisuelsParStatut: Object.fromEntries(
          controlesParStatut.map(({ statut, _count }) => [statut, _count._all]),
        ),
      },
      facturesRecentes: recentes,
    };
  }

  private normaliser(texte: string): string {
    return texte
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
