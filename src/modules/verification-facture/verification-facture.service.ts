import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Readable } from 'node:stream';
import {
  GraviteControle,
  Prisma,
  StatutControleVisuel,
  StatutResultatControle,
  StatutFacture,
  TypeMouvement,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FileStorageService } from '../../infrastructure/storage/file-storage.service.js';
import type { DbClient } from '../../infrastructure/prisma/db-client.type.js';
import { appliquerRegles } from './verification-facture.rules.js';
import { VerificationFactureOcrService } from './verification-facture.ocr.js';
import { VerificationFactureOllamaService } from './verification-facture.ollama.js';
import { VerificationFactureActesService } from './verification-facture.actes.js';
import type {
  ExtractionFacture,
  RapportControleVisuel,
  ResultatControle,
} from './verification-facture.types.js';

@Injectable()
export class VerificationFactureService {
  private readonly logger = new Logger(VerificationFactureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockage: FileStorageService,
    private readonly ocr: VerificationFactureOcrService,
    private readonly ollama: VerificationFactureOllamaService,
    private readonly actes: VerificationFactureActesService,
  ) {}

  async lancer(
    factureId: number,
    lanceParId: number,
  ): Promise<RapportControleVisuel> {
    const facture = await this.prisma.factureGlobale.findUnique({
      where: { id: factureId },
      include: {
        prestataire: { select: { id: true, nom: true } },
        piecesJointes: {
          select: {
            id: true,
            path: true,
            typeFichier: true,
            attestation: {
              select: {
                id: true,
                reference: true,
                naturePrestation: true,
                datePEC: true,
                statut: true,
                statutUtilisation: true,
                prestataireID: true,
                idpBeneficiaire: true,
                beneficiaire: {
                  select: {
                    personne: { select: { nom: true, prenom: true } },
                  },
                },
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (facture === null) {
      throw new NotFoundException(`La facture ${factureId} est introuvable.`);
    }

    await this.prisma.controleVisuelFacture.upsert({
      where: { factureGlobaleId: factureId },
      create: { factureGlobaleId: factureId, statut: StatutControleVisuel.EN_COURS, lanceParId },
      update: {
        statut: StatutControleVisuel.EN_COURS,
        lanceParId,
        confirmeParId: null,
        confirmeLe: null,
      },
    });

    try {
      const texte = await this.extraireTexte(facture.piecesJointes);
      const extraction = await this.ollama.extraire(texte);
      const attestations = facture.piecesJointes
        .map((piece) => piece.attestation)
        .filter(
          (attestation): attestation is NonNullable<typeof attestation> =>
            attestation !== null,
        )
        .map((attestation) => ({
          ...attestation,
          beneficiaire: attestation.beneficiaire?.personne ?? null,
        }));
      const resultats = [
        ...appliquerRegles(extraction, {
        montantTotal: facture.montantTotal === null
          ? null
          : Number(facture.montantTotal),
        prestataire: facture.prestataire.nom,
        prestataireId: facture.prestataire.id,
        dateFacture: facture.dateFacture,
        nombrePieces: facture.piecesJointes.length,
        attestations,
        }),
        ...(await this.actes.rapprocher(extraction, attestations)),
      ];

      return this.enregistrerResultat(
        factureId,
        extraction,
        resultats,
        lanceParId,
      );
    } catch (error: unknown) {
      await this.marquerErreur(factureId, lanceParId, error);
      throw error;
    }
  }

  async obtenir(factureId: number): Promise<RapportControleVisuel> {
    const facture = await this.prisma.factureGlobale.findUnique({
      where: { id: factureId },
      select: { id: true },
    });
    if (facture === null) {
      throw new NotFoundException(`La facture ${factureId} est introuvable.`);
    }

    const controle = await this.prisma.controleVisuelFacture.findUnique({
      where: { factureGlobaleId: factureId },
      include: { resultats: { orderBy: { id: 'asc' } } },
    });
    if (controle === null) {
      throw new NotFoundException(
        `Aucun contrôle visuel n'a encore été lancé pour la facture ${factureId}.`,
      );
    }

    return this.formater(controle, this.extraireDepuisJson(controle.resultatJson));
  }

  async confirmer(
    factureId: number,
    confirmeParId: number,
  ): Promise<RapportControleVisuel> {
    const controle = await this.prisma.controleVisuelFacture.findUnique({
      where: { factureGlobaleId: factureId },
      include: { resultats: true },
    });
    if (controle === null) {
      throw new NotFoundException(
        `Aucun contrôle visuel n'a encore été lancé pour la facture ${factureId}.`,
      );
    }
    if (controle.statut === StatutControleVisuel.ANOMALIE) {
      throw new ConflictException(
        'La facture contient des anomalies bloquantes et ne peut pas être confirmée.',
      );
    }
    if (controle.statut === StatutControleVisuel.EN_COURS) {
      throw new ConflictException(
        'Le contrôle visuel est encore en cours.',
      );
    }
    if (controle.statut === StatutControleVisuel.ERREUR) {
      throw new ConflictException(
        'Le contrôle visuel est en erreur et doit être relancé.',
      );
    }

    await this.prisma.controleVisuelFacture.update({
      where: { factureGlobaleId: factureId },
      data: {
        statut: StatutControleVisuel.CONFORME,
        confirmeParId,
        confirmeLe: new Date(),
      },
    });
    return this.obtenir(factureId);
  }

  async retourner(
    factureId: number,
    effectueParId: number,
    remarque: string,
  ): Promise<RapportControleVisuel> {
    const controle = await this.prisma.controleVisuelFacture.findUnique({
      where: { factureGlobaleId: factureId },
    });
    if (controle === null) {
      throw new NotFoundException(
        `Aucun contrôle visuel n'a encore été lancé pour la facture ${factureId}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const facture = await tx.factureGlobale.findUnique({
        where: { id: factureId },
        select: { statut: true },
      });
      if (facture === null) {
        throw new NotFoundException(`La facture ${factureId} est introuvable.`);
      }
      if (facture.statut !== StatutFacture.ENREGISTREE) {
        throw new ConflictException(
          'Seule une facture ENREGISTREE peut être retournée au prestataire.',
        );
      }
      await tx.factureGlobale.update({
        where: { id: factureId },
        data: { statut: StatutFacture.RETOURNEE },
      });
      await tx.controleVisuelFacture.update({
        where: { factureGlobaleId: factureId },
        data: {
          statut: StatutControleVisuel.ANOMALIE,
          confirmeParId: null,
          confirmeLe: null,
        },
      });
      await tx.mouvementFacture.create({
        data: {
          factureGlobaleId: factureId,
          type: TypeMouvement.RETOUR_PRESTATAIRE,
          effectueParId,
          remarque,
        },
      });
    });

    return this.obtenir(factureId);
  }

  async verifierTraitementAutorise(
    factureId: number,
    client: DbClient = this.prisma,
  ): Promise<void> {
    const facture = await client.factureGlobale.findUnique({
      where: { id: factureId },
      select: { statut: true },
    });
    if (facture?.statut === StatutFacture.VALIDEE) return;

    const controle = await client.controleVisuelFacture.findUnique({
      where: { factureGlobaleId: factureId },
      select: { statut: true },
    });
    if (controle?.statut !== StatutControleVisuel.CONFORME) {
      throw new ConflictException(
        'La facture doit être confirmée conforme par un utilisateur avant son traitement.',
      );
    }
  }

  async verifierT5Finalise(
    factureId: number,
    client: DbClient = this.prisma,
  ): Promise<void> {
    const facture = await client.factureGlobale.findUnique({
      where: { id: factureId },
      select: {
        montantTotal: true,
        total100Cem: true,
        totalDepassement: true,
        montant80Cem: true,
        montant20Agent: true,
        totalChargeAgent: true,
      },
    });
    if (
      facture === null ||
      facture.montantTotal === null ||
      facture.total100Cem === null ||
      facture.totalDepassement === null ||
      facture.montant80Cem === null ||
      facture.montant20Agent === null ||
      facture.totalChargeAgent === null
    ) {
      throw new ConflictException(
        'Les montants de la facture globale T5 doivent être finalisés avant la création des lignes T6.',
      );
    }
  }

  private async extraireTexte(
    pieces: Array<{ path: string; typeFichier: string }>,
  ): Promise<string> {
    const textes: string[] = [];
    for (const piece of pieces) {
      const flux = await this.stockage.openStoredFile(piece.path);
      if (flux === null) {
        throw new NotFoundException(
          `Le fichier de la pièce jointe ${piece.path} est introuvable.`,
        );
      }
      const buffer = await this.lireFlux(flux);
      const texte = await this.ocr.extraire(buffer, piece.typeFichier);
      if (texte !== '') {
        textes.push(texte);
      }
    }
    return textes.join('\n\n--- DOCUMENT SUIVANT ---\n\n');
  }

  private async lireFlux(flux: Readable): Promise<Buffer> {
    const morceaux: Buffer[] = [];
    for await (const morceau of flux) {
      morceaux.push(Buffer.isBuffer(morceau) ? morceau : Buffer.from(morceau));
    }
    return Buffer.concat(morceaux);
  }

  private async enregistrerResultat(
    factureId: number,
    extraction: ExtractionFacture,
    resultats: ResultatControle[],
    lanceParId: number,
  ): Promise<RapportControleVisuel> {
    const statut = resultats.some(
      (resultat) => resultat.statut === StatutResultatControle.ANOMALIE,
    )
      ? StatutControleVisuel.ANOMALIE
      : StatutControleVisuel.A_VERIFIER;
    const score = this.calculerScore(resultats);

    const controle = await this.prisma.$transaction(async (tx) => {
      const actuel = await tx.controleVisuelFacture.upsert({
        where: { factureGlobaleId: factureId },
        create: {
          factureGlobaleId: factureId,
          statut,
          score,
          resultatJson: extraction as Prisma.InputJsonValue,
          lanceParId,
        },
        update: {
          statut,
          score,
          resultatJson: extraction as Prisma.InputJsonValue,
          lanceParId,
          confirmeParId: null,
          confirmeLe: null,
        },
      });
      await tx.resultatControleFacture.deleteMany({
        where: { controleVisuelFactureId: actuel.id },
      });
      await tx.resultatControleFacture.createMany({
        data: resultats.map((resultat) => ({
          controleVisuelFactureId: actuel.id,
          code: resultat.code,
          statut: resultat.statut,
          gravite: resultat.gravite,
          valeurAttendue: resultat.valeurAttendue,
          valeurTrouvee: resultat.valeurTrouvee,
          preuve: resultat.preuve,
          confiance: resultat.confiance,
          confirme: resultat.confirme,
        })),
      });
      return tx.controleVisuelFacture.findUniqueOrThrow({
        where: { id: actuel.id },
        include: { resultats: { orderBy: { id: 'asc' } } },
      });
    });

    return this.formater(controle, extraction);
  }

  private async marquerErreur(
    factureId: number,
    lanceParId: number,
    error: unknown,
  ): Promise<void> {
    this.logger.error(
      `Le contrôle visuel de la facture ${factureId} a échoué.`,
      error instanceof Error ? error.stack : String(error),
    );
    await this.prisma.controleVisuelFacture.update({
      where: { factureGlobaleId: factureId },
      data: { statut: StatutControleVisuel.ERREUR, lanceParId },
    });
  }

  private calculerScore(resultats: ResultatControle[]): number {
    if (resultats.length === 0) return 0;
    const conformes = resultats.filter(
      (resultat) => resultat.statut === StatutResultatControle.CONFORME,
    ).length;
    return Number(((conformes / resultats.length) * 100).toFixed(2));
  }

  private formater(
    controle: {
      id: number;
      factureGlobaleId: number;
      statut: StatutControleVisuel;
      score: Prisma.Decimal | null;
      createdAt: Date;
      updatedAt: Date;
      confirmeParId: number | null;
      confirmeLe: Date | null;
      resultats: Array<{
        code: string;
        statut: StatutResultatControle;
        gravite: GraviteControle;
        valeurAttendue: string | null;
        valeurTrouvee: string | null;
        preuve: string | null;
        confiance: Prisma.Decimal | null;
        confirme: boolean;
      }>;
    },
    extraction: ExtractionFacture | null,
  ): RapportControleVisuel {
    return {
      id: controle.id,
      factureGlobaleId: controle.factureGlobaleId,
      statut: controle.statut,
      score: controle.score === null ? null : Number(controle.score),
      extraction,
      resultats: controle.resultats.map((resultat) => ({
        code: resultat.code,
        statut: resultat.statut,
        gravite: resultat.gravite,
        valeurAttendue: resultat.valeurAttendue,
        valeurTrouvee: resultat.valeurTrouvee,
        preuve: resultat.preuve,
        confiance:
          resultat.confiance === null ? null : Number(resultat.confiance),
        confirme: resultat.confirme,
      })),
      createdAt: controle.createdAt,
      updatedAt: controle.updatedAt,
      confirmeParId: controle.confirmeParId,
      confirmeLe: controle.confirmeLe,
    };
  }

  private extraireDepuisJson(valeur: Prisma.JsonValue | null): ExtractionFacture | null {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) {
      return null;
    }
    const objet = valeur as Record<string, unknown>;
    return {
      destinataire: this.texte(objet.destinataire),
      montantChiffres: this.nombre(objet.montantChiffres),
      montantLettres: this.texte(objet.montantLettres),
      montantLettresValeur: this.nombre(objet.montantLettresValeur),
      prestataire: this.texte(objet.prestataire),
      beneficiaire: this.texte(objet.beneficiaire),
      numeroFacture: this.texte(objet.numeroFacture),
      dateFacture: this.texte(objet.dateFacture),
      actes: Array.isArray(objet.actes)
        ? objet.actes.filter((acte): acte is string => typeof acte === 'string')
        : [],
    };
  }

  private texte(valeur: unknown): string | null {
    return typeof valeur === 'string' ? valeur : null;
  }

  private nombre(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null;
  }
}
