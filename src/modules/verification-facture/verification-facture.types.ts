import type {
  GraviteControle,
  StatutAttestation,
  StatutControleVisuel,
  StatutResultatControle,
  StatutUtilisationAttestation,
} from '../../generated/prisma/enums.js';

export type ExtractionFacture = {
  destinataire: string | null;
  montantChiffres: number | null;
  montantLettres: string | null;
  montantLettresValeur: number | null;
  prestataire: string | null;
  beneficiaire: string | null;
  numeroFacture: string | null;
  dateFacture: string | null;
  actes: string[];
};

export type ResultatControle = {
  code: string;
  statut: StatutResultatControle;
  gravite: GraviteControle;
  valeurAttendue: string | null;
  valeurTrouvee: string | null;
  preuve: string | null;
  confiance: number | null;
  confirme: boolean;
};

export type AttestationControle = {
  id: number;
  reference: string;
  naturePrestation: string;
  datePEC: Date;
  statut: StatutAttestation;
  statutUtilisation: StatutUtilisationAttestation;
  prestataireID: number;
  idpBeneficiaire: string;
  beneficiaire: { nom: string; prenom: string } | null;
};

export type RapportControleVisuel = {
  id: number;
  factureGlobaleId: number;
  statut: StatutControleVisuel;
  score: number | null;
  extraction: ExtractionFacture | null;
  resultats: ResultatControle[];
  createdAt: Date;
  updatedAt: Date;
  confirmeParId: number | null;
  confirmeLe: Date | null;
};

export type RetourControleVisuel = {
  remarque: string;
};
