import {
  GraviteControle,
  StatutAttestation,
  StatutResultatControle,
  StatutUtilisationAttestation,
} from '../../generated/prisma/enums.js';
import type {
  AttestationControle,
  ExtractionFacture,
  ResultatControle,
} from './verification-facture.types.js';

type ContexteRegles = {
  montantTotal: number | null;
  prestataire: string;
  prestataireId: number;
  dateFacture: Date;
  nombrePieces: number;
  attestations: AttestationControle[];
};

const DESTINATAIRE_ATTENDU = 'Caisse d Epargne de Madagascar';

export function appliquerRegles(
  extraction: ExtractionFacture,
  contexte: ContexteRegles,
): ResultatControle[] {
  return [
    verifierPieces(contexte.nombrePieces),
    verifierDestinataire(extraction.destinataire),
    verifierMontants(
      contexte.montantTotal,
      extraction.montantChiffres,
      extraction.montantLettres,
      extraction.montantLettresValeur,
    ),
    verifierPrestataire(extraction.prestataire, contexte.prestataire),
    verifierDateFacture(extraction.dateFacture, contexte.dateFacture),
    ...verifierAttestations(extraction, contexte),
  ];
}

function verifierPieces(nombrePieces: number): ResultatControle {
  return nombrePieces > 0
    ? conforme('PIECES_JOINTES_PRESENTES', `${nombrePieces} pièce(s) jointe(s).`)
    : anomalie(
        'PIECES_JOINTES_MANQUANTES',
        GraviteControle.BLOQUANTE,
        'Au moins une facture ou pièce justificative est attendue.',
        null,
      );
}

function verifierDestinataire(destinataire: string | null): ResultatControle {
  if (destinataire === null) {
    return aVerifier(
      'DESTINATAIRE_NON_LISIBLE',
      'Caisse d Epargne de Madagascar',
      null,
    );
  }
  const normalise = normaliser(destinataire);
  return normalise.includes('CAISSE') &&
    normalise.includes('EPARGNE') &&
    normalise.includes('MADAGASCAR')
    ? conforme('DESTINATAIRE_CONFORME', destinataire)
    : anomalie(
        'DESTINATAIRE_INCORRECT',
        GraviteControle.BLOQUANTE,
        DESTINATAIRE_ATTENDU,
        destinataire,
      );
}

function verifierMontants(
  montantTotal: number | null,
  montantChiffres: number | null,
  montantLettres: string | null,
  montantLettresValeur: number | null,
): ResultatControle {
  if (montantTotal === null || montantChiffres === null) {
    return aVerifier('MONTANT_NON_LISIBLE', String(montantTotal ?? ''), montantLettres);
  }
  if (Math.abs(montantTotal - montantChiffres) > 0.01) {
    return anomalie(
      'MONTANT_FACTURE_DIFFERENT',
      GraviteControle.BLOQUANTE,
      montantTotal.toFixed(2),
      montantChiffres.toFixed(2),
    );
  }
  if (montantLettres === null || montantLettresValeur === null) {
    return aVerifier('MONTANT_EN_LETTRES_NON_INTERPRETABLE', montantLettres, null);
  }
  return Math.abs(montantChiffres - montantLettresValeur) <= 0.01
    ? conforme('MONTANT_CHIFFRES_LETTRES_COHERENT', montantChiffres.toFixed(2))
    : anomalie(
        'MONTANT_CHIFFRES_LETTRES_DIFFERENT',
        GraviteControle.BLOQUANTE,
        montantChiffres.toFixed(2),
        `${montantLettres} (${montantLettresValeur.toFixed(2)})`,
      );
}

function verifierPrestataire(
  prestataireExtrait: string | null,
  prestataireAttendu: string,
): ResultatControle {
  if (prestataireExtrait === null) {
    return aVerifier('PRESTATAIRE_NON_LISIBLE', prestataireAttendu, null);
  }
  const extrait = normaliser(prestataireExtrait);
  const attendu = normaliser(prestataireAttendu);
  return extrait.includes(attendu) || attendu.includes(extrait)
    ? conforme('PRESTATAIRE_COHERENT', prestataireExtrait)
    : anomalie(
        'PRESTATAIRE_DIFFERENT',
        GraviteControle.MAJEURE,
        prestataireAttendu,
        prestataireExtrait,
      );
}

function verifierDateFacture(
  dateExtraite: string | null,
  dateAttendue: Date,
): ResultatControle {
  const dateAttendueTexte = dateAttendue.toISOString().slice(0, 10);
  if (dateExtraite === null) {
    return aVerifier('DATE_FACTURE_NON_LISIBLE', dateAttendueTexte, null);
  }
  const date = new Date(`${dateExtraite}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateAttendueTexte
    ? conforme('DATE_FACTURE_COHERENTE', dateExtraite)
    : anomalie(
        'DATE_FACTURE_DIFFERENTE',
        GraviteControle.MAJEURE,
        dateAttendueTexte,
        dateExtraite,
      );
}

function verifierAttestations(
  extraction: ExtractionFacture,
  contexte: ContexteRegles,
): ResultatControle[] {
  if (contexte.attestations.length === 0) {
    return [
      aVerifier(
        'ATTESTATIONS_NON_RATTACHEES',
        'Au moins une attestation liée à la facture',
        null,
      ),
    ];
  }

  const resultats: ResultatControle[] = [];
  if (extraction.actes.length === 0) {
    resultats.push(aVerifier('ACTES_NON_LISIBLES', 'Un acte par attestation', null));
  } else if (extraction.actes.length > contexte.attestations.length) {
    resultats.push(
      anomalie(
        'ATTESTATION_PAR_ACTE_INSUFFISANTE',
        GraviteControle.BLOQUANTE,
        `${extraction.actes.length} attestation(s)`,
        `${contexte.attestations.length} attestation(s)`,
      ),
    );
  } else {
    resultats.push(
      conforme(
        'ATTESTATION_PAR_ACTE_PRESENTE',
        `${contexte.attestations.length} attestation(s)`,
      ),
    );
  }

  for (const attestation of contexte.attestations) {
    resultats.push(...verifierAttestation(attestation, extraction, contexte));
  }
  return resultats;
}

function verifierAttestation(
  attestation: AttestationControle,
  extraction: ExtractionFacture,
  contexte: ContexteRegles,
): ResultatControle[] {
  const resultats: ResultatControle[] = [];
  if (
    attestation.statut === StatutAttestation.REFUSEE ||
    attestation.statutUtilisation === StatutUtilisationAttestation.ANNULEE
  ) {
    resultats.push(
      anomalie(
        'ATTESTATION_INVALIDE',
        GraviteControle.BLOQUANTE,
        'Attestation validée et non annulée',
        attestation.reference,
      ),
    );
  }
  if (attestation.statutUtilisation === StatutUtilisationAttestation.CONSOMMEE) {
    resultats.push(
      anomalie(
        'ATTESTATION_DEJA_CONSOMMEE',
        GraviteControle.BLOQUANTE,
        'Attestation non consommée',
        attestation.reference,
      ),
    );
  }
  if (attestation.prestataireID !== contexte.prestataireId) {
    resultats.push(
      anomalie(
        'ATTESTATION_PRESTATAIRE_DIFFERENT',
        GraviteControle.MAJEURE,
        contexte.prestataire,
        attestation.reference,
      ),
    );
  }
  if (attestation.datePEC > contexte.dateFacture) {
    resultats.push(
      anomalie(
        'ATTESTATION_APRES_FACTURE',
        GraviteControle.MAJEURE,
        contexte.dateFacture.toISOString().slice(0, 10),
        attestation.datePEC.toISOString().slice(0, 10),
      ),
    );
  }
  if (extraction.beneficiaire !== null && attestation.beneficiaire !== null) {
    const nom = normaliser(
      `${attestation.beneficiaire.nom} ${attestation.beneficiaire.prenom}`,
    );
    const trouve = normaliser(extraction.beneficiaire);
    if (!nom.includes(trouve) && !trouve.includes(nom)) {
      resultats.push(
        anomalie(
          'ATTESTATION_BENEFICIAIRE_DIFFERENT',
          GraviteControle.BLOQUANTE,
          `${attestation.beneficiaire.nom} ${attestation.beneficiaire.prenom}`,
          extraction.beneficiaire,
        ),
      );
    } else {
      resultats.push(
        conforme('ATTESTATION_BENEFICIAIRE_COHERENT', attestation.reference),
      );
    }
  } else {
    resultats.push(
      aVerifier(
        'ATTESTATION_BENEFICIAIRE_NON_VERIFIABLE',
        attestation.reference,
        null,
      ),
    );
  }
  return resultats;
}

function conforme(code: string, valeurTrouvee: string): ResultatControle {
  return {
    code,
    statut: StatutResultatControle.CONFORME,
    gravite: GraviteControle.INFORMATION,
    valeurAttendue: null,
    valeurTrouvee,
    preuve: null,
    confiance: 100,
    confirme: false,
  };
}

function aVerifier(
  code: string,
  valeurAttendue: string | null,
  valeurTrouvee: string | null,
): ResultatControle {
  return {
    code,
    statut: StatutResultatControle.A_VERIFIER,
    gravite: GraviteControle.MAJEURE,
    valeurAttendue,
    valeurTrouvee,
    preuve: 'La donnée n est pas suffisamment lisible ou structurée.',
    confiance: null,
    confirme: false,
  };
}

function anomalie(
  code: string,
  gravite: GraviteControle,
  valeurAttendue: string,
  valeurTrouvee: string | null,
): ResultatControle {
  return {
    code,
    statut: StatutResultatControle.ANOMALIE,
    gravite,
    valeurAttendue,
    valeurTrouvee,
    preuve: null,
    confiance: 100,
    confirme: false,
  };
}

function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
