import { Injectable } from '@nestjs/common';
import { env } from '../../common/settings/env.validator.js';
import {
  GraviteControle,
  StatutResultatControle,
} from '../../generated/prisma/enums.js';
import type {
  AttestationControle,
  ExtractionFacture,
  ResultatControle,
} from './verification-facture.types.js';

const SEUIL_CONFORME = 0.82;
const SEUIL_A_VERIFIER = 0.6;

@Injectable()
export class VerificationFactureActesService {
  async rapprocher(
    extraction: ExtractionFacture,
    attestations: AttestationControle[],
  ): Promise<ResultatControle[]> {
    if (extraction.actes.length === 0 || attestations.length === 0) return [];

    const resultats: ResultatControle[] = [];
    const attestationsUtilisees = new Set<number>();
    const actesAComparer: string[] = [];

    for (const acte of extraction.actes) {
      const correspondance = attestations.find(
        (attestation) =>
          !attestationsUtilisees.has(attestation.id) &&
          this.textesCorrespondent(acte, attestation.naturePrestation),
      );
      if (correspondance) {
        attestationsUtilisees.add(correspondance.id);
        resultats.push(
          this.conforme(
            'ACTE_ATTESTATION_LIBELLE_COHERENT',
            acte,
            correspondance.reference,
          ),
        );
      } else {
        actesAComparer.push(acte);
      }
    }

    if (actesAComparer.length === 0) return resultats;

    const disponibles = attestations.filter(
      (attestation) => !attestationsUtilisees.has(attestation.id),
    );
    if (disponibles.length === 0) {
      return [
        ...resultats,
        ...actesAComparer.map((acte) =>
          this.anomalie(
            'ACTE_ATTESTATION_DIFFERENT',
            acte,
            'Aucune attestation disponible',
          ),
        ),
      ];
    }

    try {
      const embeddings = await this.obtenirEmbeddings([
        ...actesAComparer,
        ...disponibles.map((attestation) => attestation.naturePrestation),
      ]);
      const actesEmbeddings = embeddings.slice(0, actesAComparer.length);
      const attestationsEmbeddings = embeddings.slice(actesAComparer.length);

      for (let index = 0; index < actesAComparer.length; index += 1) {
        const acte = actesAComparer[index];
        const meilleur = this.meilleureCorrespondance(
          actesEmbeddings[index],
          attestationsEmbeddings,
          disponibles,
        );
        if (meilleur === null) {
          resultats.push(
            this.aVerifier(
              'ACTE_ATTESTATION_RAPPROCHEMENT_IMPOSSIBLE',
              acte,
              null,
            ),
          );
          continue;
        }
        resultats.push(this.resultatPourScore(acte, meilleur));
      }
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Erreur inconnue';
      resultats.push(
        this.aVerifier(
          'ACTES_RAPPROCHEMENT_SEMANTIQUE_INDISPONIBLE',
          actesAComparer.join(', '),
          detail,
        ),
      );
    }

    return resultats;
  }

  private async obtenirEmbeddings(textes: string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.OLLAMA_TIMEOUT_MS);
    try {
      const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.OLLAMA_EMBEDDING_MODEL,
          input: textes,
        }),
      });
      if (!response.ok) {
        throw new Error(`Ollama embeddings a répondu HTTP ${response.status}.`);
      }
      const contenu: unknown = await response.json();
      if (!this.estObjet(contenu) || !Array.isArray(contenu.embeddings)) {
        throw new Error('Ollama n’a pas retourné de vecteurs exploitables.');
      }
      const embeddings = contenu.embeddings.filter(
        (embedding): embedding is number[] =>
          Array.isArray(embedding) &&
          embedding.every((valeur) => typeof valeur === 'number'),
      );
      if (embeddings.length !== textes.length) {
        throw new Error(
          'Le nombre de vecteurs retournés par Ollama est incomplet.',
        );
      }
      return embeddings;
    } finally {
      clearTimeout(timer);
    }
  }

  private meilleureCorrespondance(
    acte: number[] | undefined,
    attestations: number[][],
    donnees: AttestationControle[],
  ): { attestation: AttestationControle; score: number } | null {
    if (!acte) return null;
    let meilleur: { attestation: AttestationControle; score: number } | null = null;
    for (const [index, attestation] of attestations.entries()) {
      const score = this.cosinus(acte, attestation);
      if (meilleur === null || score > meilleur.score) {
        meilleur = { attestation: donnees[index], score };
      }
    }
    return meilleur;
  }

  private resultatPourScore(
    acte: string,
    correspondance: { attestation: AttestationControle; score: number },
  ): ResultatControle {
    const confiance = Math.round(correspondance.score * 100);
    if (correspondance.score >= SEUIL_CONFORME) {
      return this.conforme(
        'ACTE_ATTESTATION_SEMANTIQUE_COHERENT',
        acte,
        correspondance.attestation.reference,
        confiance,
      );
    }
    if (correspondance.score >= SEUIL_A_VERIFIER) {
      return this.aVerifier(
        'ACTE_ATTESTATION_SEMANTIQUE_A_VERIFIER',
        acte,
        `${correspondance.attestation.reference} (${confiance} %)`,
        confiance,
      );
    }
    return this.anomalie(
      'ACTE_ATTESTATION_DIFFERENT',
      acte,
      `${correspondance.attestation.reference} (${confiance} %)`,
      confiance,
    );
  }

  private textesCorrespondent(gauche: string, droite: string): boolean {
    const gaucheNormalise = this.normaliser(gauche);
    const droiteNormalise = this.normaliser(droite);
    return (
      gaucheNormalise !== '' &&
      (gaucheNormalise === droiteNormalise ||
        gaucheNormalise.includes(droiteNormalise) ||
        droiteNormalise.includes(gaucheNormalise))
    );
  }

  private normaliser(texte: string): string {
    return texte
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private cosinus(gauche: number[], droite: number[]): number {
    if (gauche.length !== droite.length || gauche.length === 0) return 0;
    let produit = 0;
    let normeGauche = 0;
    let normeDroite = 0;
    for (let index = 0; index < gauche.length; index += 1) {
      produit += gauche[index] * droite[index];
      normeGauche += gauche[index] ** 2;
      normeDroite += droite[index] ** 2;
    }
    if (normeGauche === 0 || normeDroite === 0) return 0;
    return produit / Math.sqrt(normeGauche * normeDroite);
  }

  private conforme(
    code: string,
    valeurTrouvee: string,
    preuve: string,
    confiance = 100,
  ): ResultatControle {
    return {
      code,
      statut: StatutResultatControle.CONFORME,
      gravite: GraviteControle.INFORMATION,
      valeurAttendue: preuve,
      valeurTrouvee,
      preuve,
      confiance,
      confirme: false,
    };
  }

  private aVerifier(
    code: string,
    valeurTrouvee: string,
    preuve: string | null,
    confiance: number | null = null,
  ): ResultatControle {
    return {
      code,
      statut: StatutResultatControle.A_VERIFIER,
      gravite: GraviteControle.MINEURE,
      valeurAttendue: null,
      valeurTrouvee,
      preuve,
      confiance,
      confirme: false,
    };
  }

  private anomalie(
    code: string,
    valeurTrouvee: string,
    preuve: string,
    confiance = 0,
  ): ResultatControle {
    return {
      code,
      statut: StatutResultatControle.ANOMALIE,
      gravite: GraviteControle.BLOQUANTE,
      valeurAttendue: preuve,
      valeurTrouvee,
      preuve,
      confiance,
      confirme: false,
    };
  }

  private estObjet(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null;
  }
}
