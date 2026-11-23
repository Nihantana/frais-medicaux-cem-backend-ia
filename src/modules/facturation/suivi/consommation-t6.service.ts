import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  StatutFacture,
  TypeConsommationT6,
} from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { ConsommationT6QueryDto } from '../dtos/consommation-t6.dto.js';

const MEDICAMENTS_API_BASE_URL = 'https://medicaments-api.giygas.dev';

export interface MedicamentRecherche {
  sourceId: string | null;
  source: string;
  nom: string;
  substanceActive: string | null;
}

export interface RechercheMedicamentsResultat {
  suggestions: MedicamentRecherche[];
  avertissement: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normaliserNom(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function lireMedicamentsBdpm(payload: unknown): MedicamentRecherche[] {
  if (!Array.isArray(payload)) {
    throw new ServiceUnavailableException(
      'La réponse de l’API Médicaments FR est invalide.',
    );
  }

  const suggestions = new Map<string, MedicamentRecherche>();
  for (const element of payload) {
    if (!isRecord(element)) continue;
    const cis =
      typeof element.cis === 'string' || typeof element.cis === 'number'
        ? String(element.cis)
        : '';
    const nom =
      typeof element.elementPharmaceutique === 'string'
        ? element.elementPharmaceutique.trim()
        : '';
    if (!/^\d{8}$/.test(cis) || !nom || suggestions.has(cis)) continue;

    const substances = Array.isArray(element.composition)
      ? element.composition.flatMap((composant) => {
          if (
            !isRecord(composant) ||
            composant.natureComposant !== 'SA' ||
            typeof composant.denominationSubstance !== 'string'
          ) {
            return [];
          }
          return [composant.denominationSubstance.trim()];
        })
      : [];
    suggestions.set(cis, {
      sourceId: cis,
      source: 'BDPM',
      nom,
      substanceActive:
        [...new Set(substances)].filter(Boolean).join(', ') || null,
    });
  }
  return [...suggestions.values()];
}

@Injectable()
export class ConsommationT6Service {
  constructor(private readonly prisma: PrismaService) {}

  async verifierBeneficiaire(
    idp: string,
  ): Promise<{ idp: string; nomPrenomBeneficiaire: string }> {
    const identifiant = idp.trim();
    if (!identifiant) {
      throw new BadRequestException('Saisissez l’identifiant du bénéficiaire.');
    }

    const beneficiaire = await this.prisma.beneficiaire.findUnique({
      where: { idp: identifiant },
      select: {
        idp: true,
        personne: { select: { nom: true, prenom: true } },
      },
    });
    if (!beneficiaire) {
      throw new NotFoundException('Bénéficiaire introuvable.');
    }

    return {
      idp: beneficiaire.idp,
      nomPrenomBeneficiaire: `${beneficiaire.personne.nom} ${beneficiaire.personne.prenom}`,
    };
  }

  async rechercherMedicaments(
    terme: string,
  ): Promise<RechercheMedicamentsResultat> {
    const recherche = terme.trim();
    if (recherche.length < 2) {
      throw new BadRequestException(
        'Saisissez au moins deux caractères pour rechercher un médicament.',
      );
    }
    if (recherche.split(/\s+/).length > 6) {
      throw new BadRequestException(
        'La recherche est limitée à six mots. Vous pouvez aussi saisir le nom manuellement.',
      );
    }

    const locaux = await this.prisma.medicamentReference.findMany({
      where: {
        OR: [
          { nom: { contains: recherche, mode: 'insensitive' } },
          { substanceActive: { contains: recherche, mode: 'insensitive' } },
        ],
      },
      select: {
        sourceId: true,
        source: true,
        nom: true,
        substanceActive: true,
      },
      orderBy: { nom: 'asc' },
      take: 10,
    });

    let avertissement: string | null = null;
    let resultatsBdpm: MedicamentRecherche[] = [];
    try {
      const url = new URL('/v1/medicaments', MEDICAMENTS_API_BASE_URL);
      url.searchParams.set('search', recherche);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.status !== 404 && !response.ok) {
        throw new ServiceUnavailableException(
          `L’API Médicaments FR a répondu avec le statut ${response.status}.`,
        );
      }
      if (response.status !== 404) {
        let payload: unknown;
        try {
          payload = await response.json();
        } catch (error: unknown) {
          throw new ServiceUnavailableException(
            `La réponse de l’API Médicaments FR est invalide : ${
              error instanceof Error ? error.message : 'format JSON incorrect'
            }`,
          );
        }
        resultatsBdpm = lireMedicamentsBdpm(payload);
      }
    } catch (error: unknown) {
      avertissement =
        error instanceof Error
          ? error.message
          : 'La recherche dans l’API Médicaments FR est indisponible.';
    }

    if (avertissement && locaux.length === 0) {
      throw new ServiceUnavailableException(
        `${avertissement} Vous pouvez saisir le nom du produit manuellement.`,
      );
    }

    const suggestions = new Map<string, MedicamentRecherche>();
    for (const medicament of locaux) {
      suggestions.set(normaliserNom(medicament.nom), medicament);
    }
    for (const medicament of resultatsBdpm) {
      const cle = normaliserNom(medicament.nom);
      const existant = suggestions.get(cle);
      if (!existant || existant.source !== 'BDPM') {
        suggestions.set(cle, medicament);
      }
    }

    return {
      suggestions: [...suggestions.values()].slice(0, 10),
      avertissement,
    };
  }

  async lister(query: ConsommationT6QueryDto): Promise<{
    elements: Array<{
      ligneId: number;
      dateActe: string;
      refSociale: string;
      numFacture: string;
      idp: string;
      nomPrenomBeneficiaire: string;
      type: TypeConsommationT6;
      libelle: string;
      montantActe: string;
      quantite: string | null;
      posologie: string | null;
      medicament: {
        nom: string;
        sourceId: string | null;
        rxcui: string | null;
        substanceActive: string | null;
        source: string;
        statut: string;
      } | null;
      lunettes: {
        typeVerre: string | null;
        monture: string | null;
        sphereOD: string | null;
        cylindreOD: string | null;
        axeOD: number | null;
        sphereOG: string | null;
        cylindreOG: string | null;
        axeOG: number | null;
      } | null;
      description: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    if (query.du && query.au && query.du > query.au) {
      throw new BadRequestException(
        'La date de début doit précéder ou égaler la date de fin.',
      );
    }

    const dateActe: { gte?: Date; lt?: Date } = {};
    if (query.du) dateActe.gte = new Date(`${query.du}T00:00:00.000Z`);
    if (query.au) {
      const lendemain = new Date(`${query.au}T00:00:00.000Z`);
      lendemain.setUTCDate(lendemain.getUTCDate() + 1);
      dateActe.lt = lendemain;
    }
    const where = {
      factureGlobale: { statut: { not: StatutFacture.SUPPRIMEE } },
      ...(Object.keys(dateActe).length > 0 ? { dateActe } : {}),
      ...(query.idp
        ? {
            beneficiaire: {
              idp: { contains: query.idp.trim(), mode: 'insensitive' as const },
            },
          }
        : {}),
      consommation: {
        is: query.type ? { type: query.type } : {},
      },
    };
    const [lignes, total] = await Promise.all([
      this.prisma.factureIndividuelle.findMany({
        where,
        include: {
          factureGlobale: { select: { refSociale: true, numFacture: true } },
          beneficiaire: {
            select: {
              idp: true,
              personne: { select: { nom: true, prenom: true } },
            },
          },
          consommation: { include: { medicament: true } },
        },
        orderBy: [{ dateActe: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.factureIndividuelle.count({ where }),
    ]);

    return {
      elements: lignes.flatMap((ligne) => {
        const detail = ligne.consommation;
        if (!detail) return [];
        return [
          {
            ligneId: ligne.id,
            dateActe: ligne.dateActe.toISOString().slice(0, 10),
            refSociale: ligne.factureGlobale.refSociale,
            numFacture: ligne.factureGlobale.numFacture,
            idp: ligne.beneficiaire.idp,
            nomPrenomBeneficiaire: `${ligne.beneficiaire.personne.nom} ${ligne.beneficiaire.personne.prenom}`,
            type: detail.type,
            libelle: ligne.libelle,
            montantActe: ligne.montantActe.toFixed(2),
            quantite: detail.quantite?.toFixed(2) ?? null,
            posologie: detail.posologie,
            medicament: detail.medicament
              ? {
                  nom: detail.medicament.nom,
                  sourceId: detail.medicament.sourceId,
                  rxcui:
                    detail.medicament.source === 'RXNORM'
                      ? detail.medicament.sourceId
                      : null,
                  substanceActive: detail.medicament.substanceActive,
                  source: detail.medicament.source,
                  statut: detail.medicament.statut,
                }
              : null,
            lunettes:
              detail.type === TypeConsommationT6.LUNETTES
                ? {
                    typeVerre: detail.typeVerre,
                    monture: detail.monture,
                    sphereOD: detail.sphereOD?.toFixed(2) ?? null,
                    cylindreOD: detail.cylindreOD?.toFixed(2) ?? null,
                    axeOD: detail.axeOD,
                    sphereOG: detail.sphereOG?.toFixed(2) ?? null,
                    cylindreOG: detail.cylindreOG?.toFixed(2) ?? null,
                    axeOG: detail.axeOG,
                  }
                : null,
            description: detail.description,
          },
        ];
      }),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
