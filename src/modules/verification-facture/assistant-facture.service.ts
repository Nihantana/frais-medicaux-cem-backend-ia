import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { VerificationFactureOllamaService } from './verification-facture.ollama.js';
import type { ReponseAssistantFactureDto } from './dtos/assistant-facture.dto.js';
import { DOCUMENTATION_SYSTEME_ASSISTANT } from './assistant-facture.documentation.js';

@Injectable()
export class AssistantFactureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: VerificationFactureOllamaService,
  ) {}

  async repondre(
    factureId: number,
    question: string,
  ): Promise<ReponseAssistantFactureDto> {
    const facture = await this.prisma.factureGlobale.findUnique({
      where: { id: factureId },
      select: {
        refSociale: true,
        numFacture: true,
        dateFacture: true,
        montantTotal: true,
        total100Cem: true,
        totalDepassement: true,
        statut: true,
        dateValidation: true,
        dateCloture: true,
        prestataire: { select: { nom: true } },
        _count: { select: { piecesJointes: true, lignes: true } },
        lignes: {
          select: {
            numLigne: true,
            libelle: true,
            dateActe: true,
            montantActe: true,
            montantCemIntegral: true,
            montantDepassementActe: true,
            montantDepassementPlafond: true,
            tauxCem: true,
            refPaie: true,
            moisAffectation: true,
            beneficiaire: { select: { idp: true, personne: { select: { nom: true, prenom: true } } } },
            acte: { select: { code: true, nomActe: true } },
          },
          orderBy: { numLigne: 'asc' },
        },
        controleVisuel: {
          select: {
            statut: true,
            score: true,
            resultatJson: true,
            resultats: {
              select: {
                code: true,
                statut: true,
                gravite: true,
                valeurAttendue: true,
                valeurTrouvee: true,
                preuve: true,
                confiance: true,
              },
            },
          },
        },
        mouvements: {
          orderBy: { date: 'asc' },
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

    if (facture === null) {
      throw new NotFoundException(`La facture ${factureId} est introuvable.`);
    }

    const contexte = JSON.stringify({
      documentationSysteme: DOCUMENTATION_SYSTEME_ASSISTANT,
      facture: {
        referenceSociale: facture.refSociale,
        numero: facture.numFacture,
        date: facture.dateFacture.toISOString().slice(0, 10),
        prestataire: facture.prestataire.nom,
        montantTotal: facture.montantTotal?.toString() ?? null,
        montantCem: facture.total100Cem.toString(),
        depassement: facture.totalDepassement.toString(),
        statut: facture.statut,
        dateValidation: facture.dateValidation?.toISOString() ?? null,
        dateCloture: facture.dateCloture?.toISOString() ?? null,
        nombrePiecesJointes: facture._count.piecesJointes,
        nombreLignesT6: facture._count.lignes,
        historiqueMouvements: facture.mouvements.map((mouvement) => ({
          id: mouvement.id,
          type: mouvement.type,
          date: mouvement.date.toISOString(),
          remarque: mouvement.remarque,
          service: mouvement.service,
          effectuePar: mouvement.effectuePar,
          adresseA: mouvement.adresseA,
        })),
        lignesT6: facture.lignes.map((ligne) => {
          const depassement = ligne.montantDepassementActe.plus(
            ligne.montantDepassementPlafond,
          );
          const reste = ligne.montantActe
            .minus(ligne.montantCemIntegral)
            .minus(depassement);
          const partCem = reste
            .mul(ligne.tauxCem)
            .div(100)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          const montantCem = ligne.montantCemIntegral.plus(partCem);
          const montantAgent = reste.minus(partCem);

          return ({
          numLigne: ligne.numLigne,
          libelle: ligne.libelle,
          dateActe: ligne.dateActe.toISOString().slice(0, 10),
          idp: ligne.beneficiaire.idp,
          beneficiaire: `${ligne.beneficiaire.personne.nom} ${ligne.beneficiaire.personne.prenom}`,
          acte: `${ligne.acte.code} — ${ligne.acte.nomActe}`,
          montantActe: ligne.montantActe.toString(),
          montantCemIntegral: ligne.montantCemIntegral.toString(),
          depassementActe: ligne.montantDepassementActe.toString(),
          depassementPlafond: ligne.montantDepassementPlafond.toString(),
          montantCem: montantCem.toString(),
          montantAgent: montantAgent.toString(),
          totalChargeAgent: montantAgent.plus(depassement).toString(),
          refPaie: ligne.refPaie,
          moisAffectation: ligne.moisAffectation?.toISOString().slice(0, 10) ?? null,
          });
        }),
      },
      controleVisuel: facture.controleVisuel
        ? {
            statut: facture.controleVisuel.statut,
            score: facture.controleVisuel.score?.toString() ?? null,
            extractionPieceJointe: facture.controleVisuel.resultatJson,
            resultats: facture.controleVisuel.resultats,
          }
        : null,
    });

    const reponse = await this.ollama.repondre(question.trim(), contexte);

    return {
      reponse,
      sources: facture.controleVisuel
        ? [
            'Documentation du système',
            'Données de la facture',
            'Dernier rapport de contrôle visuel',
          ]
        : ['Documentation du système', 'Données de la facture'],
      avertissement:
        'Cette réponse est une aide à la vérification. Elle ne valide, ne modifie et ne remplace jamais la décision d’un agent.',
    };
  }
}
