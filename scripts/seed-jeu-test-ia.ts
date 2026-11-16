import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import Handlebars from 'handlebars';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from '../src/app.module.js';
import { env } from '../src/common/settings/env.validator.js';
import { STORAGE_SETTINGS } from '../src/common/settings/storage.settings.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { FileStorageService } from '../src/infrastructure/storage/file-storage.service.js';
import {
  AgentConcerne,
  AgentType,
  RoleUtilisateur,
  Sexe,
  StatutAttestation,
  StatutControleVisuel,
  StatutFacture,
  StatutPEC,
  StatutPrestataire,
  StatutUtilisationAttestation,
  TypeMouvement,
  TypeRegle,
} from '../src/generated/prisma/enums.js';
import { FactureIndividuelleService } from '../src/modules/facturation/factures/individuelle/facture-individuelle.service.js';
import {
  FactureGlobaleService,
  type ActeurFacture,
} from '../src/modules/facturation/factures/globale/facture-globale.service.js';
import { CloturePaieService } from '../src/modules/facturation/factures/paie/cloture-paie.service.js';
import { RegleService } from '../src/modules/regles-prise-en-charge/regle.service.js';
import { SuiviService } from '../src/modules/facturation/suivi/suivi.service.js';

const PREFIXE = 'DEMO-IA-';
const FICHIER_MANIFESTE = join(
  STORAGE_SETTINGS.root,
  `${PREFIXE}seed-jeu-test-manifest.json`,
);
const DATE_FACTURE = '2026-01-15';
const DATE_RECEPTION = '2026-01-16';
const DATE_PEC = '2026-01-10';
const DATE_EFFET_PLAFONDS_TEST = '2026-01-01';
const DATE_FIN_PLAFONDS_TEST = '2026-11-13';
const DATE_EFFET_PLAFONDS_ACTUELS = '2026-11-14';
const DESTINATAIRE = 'Caisse d Epargne de Madagascar';
const ID_UTILISATEUR_OPERATEUR = 9001;
const ID_UTILISATEUR_ADJOINT = 9002;
const ID_UTILISATEUR_CHEF = 9003;
const MATRICULE_AGENT_BASE = 99110001;
const LIEU_NOM = 'ANTANANARIVO';
const STRUCTURE_ID = 'DRH';
const SERVICE_ID = 'SASCI';
const CODES_ACTES = ['CON-01', 'LAB-01', 'IMG-01', 'REA-02'] as const;
const SCENARIOS_T6 = new Set(['S01', 'S16A', 'S17', 'S18', 'S19']);
const STATUTS_UTILISATEURS = [
  {
    id: ID_UTILISATEUR_OPERATEUR,
    nom: 'OPERATEUR',
    role: RoleUtilisateur.OPERATEUR,
  },
  { id: ID_UTILISATEUR_ADJOINT, nom: 'ADJOINT', role: RoleUtilisateur.ADJOINT },
  { id: ID_UTILISATEUR_CHEF, nom: 'CHEF', role: RoleUtilisateur.CHEF },
] as const;

interface ManifestSeed {
  createdRuleIds: number[];
  createdPlafondIds: number[];
  createdUserIds: number[];
  filePaths: string[];
  files: Record<string, string>;
}

interface BeneficiaireSeed {
  id: number;
  idp: string;
  nom: string;
  prenom: string;
}

interface PrestataireSeed {
  id: number;
  nom: string;
}

interface LigneT6T5Seed {
  scenarioCode: string;
  factureId: number;
  attestationId: number;
  beneficiaireId: number;
  idp: string;
  acteId: number;
  codeActe: (typeof CODES_ACTES)[number];
  dateActe: string;
  montantActe: number;
  montantDepassementActe: number;
  montantDepassementPlafond: number;
  refPaie: string | null;
}

interface AttestationScenario {
  beneficiaireIndex?: number;
  prestataireIndex?: number;
  natureCode?: (typeof CODES_ACTES)[number];
  naturePrestation?: string;
  statut?: StatutAttestation;
  statutUtilisation?: StatutUtilisationAttestation;
  datePEC?: string;
}

interface Scenario {
  code: string;
  prestataireIndex: number;
  beneficiaireIndex: number;
  montantTotal: number;
  actes: (typeof CODES_ACTES)[number][];
  piece: 'pdf' | 'image' | 'aucune';
  dateFacture?: string;
  dateReception?: string;
  moisPrestation?: string;
  pdfMontant?: number;
  pdfMontantLettres?: string;
  pdfDestinataire?: string;
  pdfPrestataireIndex?: number;
  pdfBeneficiaireIndex?: number;
  pdfDateFacture?: string;
  pdfActes?: string[];
  attestation?: AttestationScenario;
  statutFacture?: StatutFacture;
  cloturee?: boolean;
  moisCloture?: string;
  dateCloture?: string;
  refPaie?: string;
  lignesAvecRefPaie?: number[];
}

const PERSONNES = [
  {
    nom: 'DEMO-IA-Rakoto',
    prenom: 'Miora',
    sexe: Sexe.FEMININ,
    naissance: '1984-05-12',
  },
  {
    nom: 'DEMO-IA-Rasolo',
    prenom: 'Hery',
    sexe: Sexe.MASCULIN,
    naissance: '1979-08-03',
  },
  {
    nom: 'DEMO-IA-Rakotobe',
    prenom: 'Tahina',
    sexe: Sexe.FEMININ,
    naissance: '1990-02-21',
  },
  {
    nom: 'DEMO-IA-Rabe',
    prenom: 'Tojo',
    sexe: Sexe.MASCULIN,
    naissance: '1987-11-07',
  },
  {
    nom: 'DEMO-IA-Razafy',
    prenom: 'Fanja',
    sexe: Sexe.FEMININ,
    naissance: '1982-04-19',
  },
  {
    nom: 'DEMO-IA-Rakotoarisoa',
    prenom: 'Lova',
    sexe: Sexe.MASCULIN,
    naissance: '1992-09-26',
  },
  {
    nom: 'DEMO-IA-Rakoto',
    prenom: 'Soa',
    sexe: Sexe.FEMININ,
    naissance: '1986-03-16',
  },
  {
    nom: 'DEMO-IA-Rasoa',
    prenom: 'Njaka',
    sexe: Sexe.MASCULIN,
    naissance: '2012-07-14',
  },
] as const;

const SCENARIOS: Scenario[] = [
  {
    code: 'S01',
    prestataireIndex: 0,
    beneficiaireIndex: 0,
    montantTotal: 200000,
    actes: ['REA-02', 'REA-02'],
    piece: 'pdf',
    attestation: { natureCode: 'REA-02' },
  },
  {
    code: 'S02',
    prestataireIndex: 0,
    beneficiaireIndex: 1,
    montantTotal: 200000,
    pdfMontant: 220000,
    actes: ['IMG-01'],
    piece: 'pdf',
    attestation: { natureCode: 'IMG-01' },
  },
  {
    code: 'S03',
    prestataireIndex: 1,
    beneficiaireIndex: 2,
    montantTotal: 230000,
    pdfMontantLettres: 'deux cent trente-cinq mille Ariary',
    actes: ['LAB-01'],
    piece: 'pdf',
    attestation: { natureCode: 'LAB-01' },
  },
  {
    code: 'S04',
    prestataireIndex: 0,
    beneficiaireIndex: 3,
    montantTotal: 150000,
    pdfDestinataire: 'Caisse Nationale d Assurance Maladie',
    actes: ['CON-01'],
    piece: 'pdf',
    attestation: {},
  },
  {
    code: 'S05',
    prestataireIndex: 0,
    beneficiaireIndex: 4,
    montantTotal: 180000,
    pdfPrestataireIndex: 1,
    actes: ['IMG-01'],
    piece: 'pdf',
    attestation: { natureCode: 'IMG-01' },
  },
  {
    code: 'S06',
    prestataireIndex: 2,
    beneficiaireIndex: 5,
    montantTotal: 95000,
    pdfDateFacture: '2026-01-14',
    actes: ['LAB-01'],
    piece: 'pdf',
    attestation: { natureCode: 'LAB-01' },
  },
  {
    code: 'S07',
    prestataireIndex: 0,
    beneficiaireIndex: 6,
    montantTotal: 80000,
    actes: ['CON-01'],
    piece: 'aucune',
  },
  {
    code: 'S08',
    prestataireIndex: 0,
    beneficiaireIndex: 7,
    montantTotal: 165000,
    actes: ['CON-01'],
    piece: 'pdf',
    attestation: { statutUtilisation: StatutUtilisationAttestation.CONSOMMEE },
  },
  {
    code: 'S09',
    prestataireIndex: 1,
    beneficiaireIndex: 0,
    montantTotal: 110000,
    actes: ['IMG-01'],
    piece: 'pdf',
    attestation: { natureCode: 'IMG-01', statut: StatutAttestation.REFUSEE },
  },
  {
    code: 'S10',
    prestataireIndex: 0,
    beneficiaireIndex: 1,
    montantTotal: 250000,
    actes: ['CON-01'],
    piece: 'pdf',
    attestation: { prestataireIndex: 1 },
  },
  {
    code: 'S11',
    prestataireIndex: 2,
    beneficiaireIndex: 2,
    montantTotal: 85000,
    actes: ['LAB-01'],
    piece: 'pdf',
    attestation: { natureCode: 'LAB-01', datePEC: '2026-01-20' },
  },
  {
    code: 'S12',
    prestataireIndex: 1,
    beneficiaireIndex: 3,
    montantTotal: 215000,
    pdfBeneficiaireIndex: 4,
    actes: ['CON-01'],
    piece: 'pdf',
    attestation: {},
  },
  {
    code: 'S13',
    prestataireIndex: 0,
    beneficiaireIndex: 5,
    montantTotal: 245000,
    actes: ['CON-01', 'IMG-01'],
    piece: 'pdf',
    attestation: { natureCode: 'CON-01' },
  },
  {
    code: 'S14',
    prestataireIndex: 0,
    beneficiaireIndex: 6,
    montantTotal: 140000,
    actes: ['CON-01'],
    pdfActes: ['Visite médicale générale'],
    piece: 'pdf',
    attestation: { natureCode: 'CON-01' },
  },
  {
    code: 'S15',
    prestataireIndex: 1,
    beneficiaireIndex: 7,
    montantTotal: 175000,
    actes: ['CON-01'],
    piece: 'image',
    attestation: {},
  },
  {
    code: 'S16A',
    prestataireIndex: 0,
    beneficiaireIndex: 0,
    montantTotal: 200000,
    actes: ['REA-02', 'REA-02'],
    piece: 'pdf',
    attestation: { natureCode: 'REA-02' },
    statutFacture: StatutFacture.VALIDEE,
    cloturee: true,
  },
  {
    code: 'S16B',
    prestataireIndex: 1,
    beneficiaireIndex: 2,
    montantTotal: 175000,
    actes: ['IMG-01'],
    piece: 'pdf',
    attestation: { natureCode: 'IMG-01' },
    statutFacture: StatutFacture.A_CORRIGER,
  },
  {
    code: 'S16C',
    prestataireIndex: 2,
    beneficiaireIndex: 4,
    montantTotal: 190000,
    actes: ['LAB-01'],
    piece: 'pdf',
    attestation: { natureCode: 'LAB-01' },
    statutFacture: StatutFacture.RETOURNEE,
  },
  {
    code: 'S17',
    prestataireIndex: 0,
    beneficiaireIndex: 0,
    montantTotal: 200000,
    actes: ['REA-02', 'REA-02'],
    piece: 'pdf',
    attestation: { natureCode: 'REA-02' },
  },
  {
    code: 'S18',
    prestataireIndex: 0,
    beneficiaireIndex: 0,
    montantTotal: 200000,
    actes: ['REA-02', 'REA-02'],
    piece: 'pdf',
    dateFacture: '2026-03-15',
    dateReception: '2026-03-16',
    moisPrestation: '2026-03-01',
    attestation: { natureCode: 'REA-02' },
    statutFacture: StatutFacture.VALIDEE,
    refPaie: 'DEMO-PAIE-2026-03',
    lignesAvecRefPaie: [1],
  },
  {
    code: 'S19',
    prestataireIndex: 0,
    beneficiaireIndex: 0,
    montantTotal: 300000,
    actes: ['REA-02', 'REA-02', 'REA-02'],
    piece: 'pdf',
    dateFacture: '2026-04-15',
    dateReception: '2026-04-16',
    moisPrestation: '2026-04-01',
    attestation: { natureCode: 'REA-02' },
    statutFacture: StatutFacture.VALIDEE,
    cloturee: true,
    moisCloture: '2026-04',
    dateCloture: '2026-04-30',
  },
];

const TEMPLATE_FACTURE = Handlebars.compile(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { background: #fff; color: #111; font-family: Arial, sans-serif; font-size: 14pt; line-height: 1.55; }
    h1 { font-size: 20pt; margin: 0 0 22pt; }
    h2 { font-size: 15pt; margin: 24pt 0 8pt; }
    p, li { margin: 7pt 0; }
    .montant { border-top: 1px solid #444; margin-top: 24pt; padding-top: 12pt; }
  </style>
</head>
<body>
  <h1>FACTURE MEDICALE</h1>
  <p>Destinataire : {{destinataire}}</p>
  <p>Prestataire : {{prestataire}}</p>
  <p>Numero de facture : {{numeroFacture}}</p>
  <p>Date de facture : {{dateFacture}}</p>
  <p>Beneficiaire : {{beneficiaire}}</p>
  <h2>Actes factures</h2>
  <ol>{{#each actes}}<li>{{this}}</li>{{/each}}</ol>
  <div class="montant">
    <p>Montant total en chiffres : {{montantChiffres}} Ariary</p>
    <p>Montant total en lettres : {{montantLettres}}</p>
  </div>
</body>
</html>`);

function dateUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function prefixe(value: string): string {
  return `${PREFIXE}${value}`;
}

function verifierLongueur(value: string, maximum: number, label: string): void {
  if (value.length > maximum) {
    throw new Error(`${label} dépasse ${maximum} caractères : ${value}`);
  }
}

function estErreurFichierAbsent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function validerCheminStockage(path: string): void {
  const isExpectedDirectory =
    path.startsWith('pdf/factures/') || path.startsWith('images/factures/');
  if (!isExpectedDirectory || path.split(/[\\/]/).includes('..')) {
    throw new Error(`Chemin de fichier de test invalide : ${path}`);
  }
  verifierLongueur(path, 100, 'Chemin de fichier');
}

async function fichierExiste(path: string): Promise<boolean> {
  validerCheminStockage(path);
  try {
    return (await stat(join(STORAGE_SETTINGS.root, path))).isFile();
  } catch (error: unknown) {
    if (estErreurFichierAbsent(error)) return false;
    throw error;
  }
}

function nouveauManifeste(): ManifestSeed {
  return {
    createdRuleIds: [],
    createdPlafondIds: [],
    createdUserIds: [],
    filePaths: [],
    files: {},
  };
}

async function lireManifeste(): Promise<ManifestSeed> {
  try {
    const contenu: unknown = JSON.parse(
      await readFile(FICHIER_MANIFESTE, 'utf8'),
    );
    if (typeof contenu !== 'object' || contenu === null) {
      throw new Error('Le manifeste de seed est invalide.');
    }
    const valeur = contenu as Partial<ManifestSeed>;
    if (
      !Array.isArray(valeur.createdRuleIds) ||
      !Array.isArray(valeur.createdUserIds) ||
      !Array.isArray(valeur.filePaths) ||
      typeof valeur.files !== 'object' ||
      valeur.files === null ||
      (valeur.createdPlafondIds !== undefined &&
        !Array.isArray(valeur.createdPlafondIds))
    ) {
      throw new Error('Le manifeste de seed est incomplet.');
    }
    for (const path of valeur.filePaths) {
      if (typeof path !== 'string') {
        throw new Error('Un chemin du manifeste de seed est invalide.');
      }
      validerCheminStockage(path);
    }
    for (const path of Object.values(valeur.files)) {
      if (typeof path !== 'string') {
        throw new Error('Un chemin indexé du manifeste de seed est invalide.');
      }
      validerCheminStockage(path);
    }
    return {
      createdRuleIds: valeur.createdRuleIds as number[],
      createdPlafondIds: (valeur.createdPlafondIds ?? []) as number[],
      createdUserIds: valeur.createdUserIds as number[],
      filePaths: valeur.filePaths as string[],
      files: valeur.files as Record<string, string>,
    };
  } catch (error: unknown) {
    if (estErreurFichierAbsent(error)) return nouveauManifeste();
    throw error;
  }
}

async function ecrireManifeste(manifest: ManifestSeed): Promise<void> {
  await mkdir(STORAGE_SETTINGS.root, { recursive: true });
  await writeFile(FICHIER_MANIFESTE, JSON.stringify(manifest, null, 2), 'utf8');
}

async function enregistrerChemin(
  manifest: ManifestSeed,
  cle: string,
  path: string,
): Promise<void> {
  validerCheminStockage(path);
  manifest.files[cle] = path;
  if (!manifest.filePaths.includes(path)) manifest.filePaths.push(path);
  await ecrireManifeste(manifest);
}

function nombreEnLettres(nombre: number): string {
  const unites = [
    'zéro',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
  ];

  const moinsDeCent = (valeur: number): string => {
    if (valeur < unites.length) return unites[valeur]!;
    if (valeur < 20) return `dix-${unites[valeur - 10]}`;
    if (valeur < 70) {
      const dizaine = Math.floor(valeur / 10) * 10;
      const reste = valeur % 10;
      const nom = new Map([
        [20, 'vingt'],
        [30, 'trente'],
        [40, 'quarante'],
        [50, 'cinquante'],
        [60, 'soixante'],
      ]).get(dizaine)!;
      if (reste === 0) return nom;
      return reste === 1 ? `${nom} et un` : `${nom}-${unites[reste]}`;
    }
    if (valeur < 80) {
      const reste = valeur - 60;
      return reste === 11
        ? 'soixante et onze'
        : `soixante-${moinsDeCent(reste)}`;
    }
    if (valeur === 80) return 'quatre-vingts';
    return `quatre-vingt-${moinsDeCent(valeur - 80)}`;
  };

  const moinsDeMille = (valeur: number): string => {
    if (valeur < 100) return moinsDeCent(valeur);
    const centaines = Math.floor(valeur / 100);
    const reste = valeur % 100;
    const prefixeCent = centaines === 1 ? 'cent' : `${unites[centaines]} cent`;
    return reste === 0
      ? centaines === 1
        ? prefixeCent
        : `${prefixeCent}s`
      : `${prefixeCent} ${moinsDeCent(reste)}`;
  };

  if (!Number.isSafeInteger(nombre) || nombre < 0 || nombre >= 1_000_000) {
    throw new Error(
      `Montant hors plage pour la conversion en lettres : ${nombre}`,
    );
  }
  if (nombre < 1000) return `${moinsDeMille(nombre)} Ariary`;
  const milliers = Math.floor(nombre / 1000);
  const reste = nombre % 1000;
  const prefixeMilliers =
    milliers === 1 ? 'mille' : `${moinsDeMille(milliers)} mille`;
  return `${prefixeMilliers}${reste === 0 ? '' : ` ${moinsDeMille(reste)}`} Ariary`;
}

function fabriquerHtmlPdf(
  scenario: Scenario,
  prestataires: PrestataireSeed[],
  beneficiaires: BeneficiaireSeed[],
  nomsActes: Map<string, string>,
): string {
  const montant = scenario.pdfMontant ?? scenario.montantTotal;
  const prestataireIndex =
    scenario.pdfPrestataireIndex ?? scenario.prestataireIndex;
  const beneficiaireIndex =
    scenario.pdfBeneficiaireIndex ?? scenario.beneficiaireIndex;
  const actes =
    scenario.pdfActes ??
    scenario.actes.map((code) => {
      const nom = nomsActes.get(code);
      if (nom === undefined) throw new Error(`L’acte ${code} est introuvable.`);
      return nom;
    });

  return TEMPLATE_FACTURE({
    destinataire: scenario.pdfDestinataire ?? DESTINATAIRE,
    prestataire: prestataires[prestataireIndex]!.nom,
    numeroFacture: prefixe(scenario.code),
    dateFacture:
      scenario.pdfDateFacture ?? scenario.dateFacture ?? DATE_FACTURE,
    beneficiaire: `${beneficiaires[beneficiaireIndex]!.nom} ${beneficiaires[beneficiaireIndex]!.prenom}`,
    actes,
    montantChiffres: String(montant),
    montantLettres: scenario.pdfMontantLettres ?? nombreEnLettres(montant),
  });
}

async function genererPdf(page: Page, html: string): Promise<Buffer> {
  await page.setContent(html, { waitUntil: 'load' });
  return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
}

async function genererImageFloue(page: Page): Promise<Buffer> {
  await page.setViewport({ width: 1120, height: 1584, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1120px; height: 1584px; background: #fff; }
      body { padding: 120px; color: #222; font: 28px Arial, sans-serif; }
      .scan { filter: blur(3px); border: 1px solid #aaa; padding: 45px; height: 100%; }
      h1 { font-size: 38px; margin: 0 0 48px; }
      p { margin: 28px 0; }
    </style></head><body><main class="scan">
      <h1>FACTURE MEDICALE</h1>
      <p>Document scanne, informations peu lisibles</p>
      <p>Copie papier de faible qualite</p>
    </main></body></html>`,
    { waitUntil: 'load' },
  );
  return Buffer.from(
    await page.screenshot({ type: 'jpeg', quality: 42, fullPage: true }),
  );
}

async function assurerPdfStocke(
  storage: FileStorageService,
  manifest: ManifestSeed,
  code: string,
  buffer: Buffer,
): Promise<string> {
  const key = `pdf:${code}`;
  const existing = manifest.files[key];
  if (existing !== undefined && (await fichierExiste(existing))) {
    const stored = await readFile(join(STORAGE_SETTINGS.root, existing));
    if (stored.equals(buffer)) return existing;
  }

  const path = await storage.savePdf(
    { buffer, name: prefixe(code) },
    'factures',
  );
  await enregistrerChemin(manifest, key, path);
  return path;
}

async function assurerImageStockee(
  storage: FileStorageService,
  manifest: ManifestSeed,
  code: string,
  buffer: Buffer,
): Promise<string> {
  const key = `image:${code}`;
  const existing = manifest.files[key];
  if (existing !== undefined && (await fichierExiste(existing)))
    return existing;

  const path = await storage.saveFactureImage({
    buffer,
    mimetype: 'image/jpeg',
  });
  await enregistrerChemin(manifest, key, path);
  return path;
}

async function assurerPieceJointe(
  prisma: PrismaService,
  manifest: ManifestSeed,
  scenario: Scenario,
  factureId: number,
  attestationId: number,
  fichier: { nom: string; type: string; tailleOctets: number; path: string },
  cleFichier: string,
): Promise<void> {
  const pieces = await prisma.pieceJointeFacture.findMany({
    where: { factureGlobaleId: factureId },
    select: {
      id: true,
      path: true,
      nomFichier: true,
      typeFichier: true,
      tailleOctets: true,
      attestationId: true,
    },
  });
  if (pieces.length > 1) {
    throw new Error(`${scenario.code} possède plusieurs pièces jointes.`);
  }
  const existante = pieces[0];
  if (existante !== undefined) {
    if (
      existante.nomFichier !== fichier.nom ||
      existante.typeFichier !== fichier.type ||
      existante.attestationId !== attestationId
    ) {
      throw new Error(
        `La pièce jointe existante de ${scenario.code} ne correspond pas au seed.`,
      );
    }
    const pathExiste = await fichierExiste(existante.path);
    const path = pathExiste ? existante.path : fichier.path;
    const taille = pathExiste
      ? (await stat(join(STORAGE_SETTINGS.root, path))).size
      : fichier.tailleOctets;
    await enregistrerChemin(manifest, cleFichier, path);
    if (existante.path !== path || existante.tailleOctets !== taille) {
      await prisma.pieceJointeFacture.update({
        where: { id: existante.id },
        data: { path, tailleOctets: taille },
      });
    }
    return;
  }

  await prisma.pieceJointeFacture.create({
    data: {
      factureGlobaleId: factureId,
      path: fichier.path,
      nomFichier: fichier.nom,
      typeFichier: fichier.type,
      tailleOctets: fichier.tailleOctets,
      ajouteParId: ID_UTILISATEUR_OPERATEUR,
      attestationId,
    },
  });
}

async function obtenirReferences(prisma: PrismaService): Promise<{
  lieuId: number;
  nomsActes: Map<string, string>;
  idsActes: Map<string, number>;
}> {
  const lieux = await prisma.lieu.findMany({
    where: { nom: LIEU_NOM },
    select: { id: true },
    take: 2,
  });
  if (lieux.length !== 1) {
    throw new Error(
      `Le lieu existant "${LIEU_NOM}" doit être présent une seule fois; aucune référence n’a été créée.`,
    );
  }

  const structure = await prisma.structureOrganisationnelle.findUnique({
    where: { id: STRUCTURE_ID },
    select: { id: true },
  });
  const service = await prisma.service.findUnique({
    where: { codeService: SERVICE_ID },
    select: { codeService: true, codeDirection: true },
  });
  if (structure === null || service?.codeDirection !== STRUCTURE_ID) {
    throw new Error(
      `La structure ${STRUCTURE_ID} et le service ${SERVICE_ID} doivent exister et correspondre.`,
    );
  }

  const actes = await prisma.acte.findMany({
    where: { code: { in: [...CODES_ACTES] } },
    select: { id: true, code: true, nomActe: true },
  });
  const nomsActes = new Map(actes.map((acte) => [acte.code, acte.nomActe]));
  const idsActes = new Map(actes.map((acte) => [acte.code, acte.id]));
  const manquant = CODES_ACTES.find((code) => !nomsActes.has(code));
  if (manquant !== undefined) {
    throw new Error(
      `L’acte existant ${manquant} est absent; aucun référentiel ne sera modifié.`,
    );
  }
  return { lieuId: lieux[0]!.id, nomsActes, idsActes };
}

async function assurerPlafondsTest(
  prisma: PrismaService,
  manifest: ManifestSeed,
  acteId: number,
): Promise<void> {
  const lignesSuiviExistantes = await prisma.ligneSuivi.count({
    where: { acteId, dateActe: { gte: dateUtc(DATE_EFFET_PLAFONDS_TEST) } },
  });
  if (lignesSuiviExistantes !== 0) {
    throw new Error(
      'Les plafonds historiques DEMO-IA ne peuvent pas être ajoutés : des lignes T5 existent déjà pour REA-02 après le 01/01/2026.',
    );
  }

  const plafondsActuels = await prisma.plafond.findMany({
    where: {
      acteID: acteId,
      dateEffet: dateUtc(DATE_EFFET_PLAFONDS_ACTUELS),
      dateFin: null,
    },
  });
  if (plafondsActuels.length !== 2) {
    throw new Error(
      'Les deux plafonds REA-02 en vigueur au 14/11/2026 sont requis; aucun référentiel ne sera inventé.',
    );
  }
  const plafondsManifestes = await prisma.plafond.findMany({
    where: { id: { in: manifest.createdPlafondIds } },
  });
  if (plafondsManifestes.length !== manifest.createdPlafondIds.length) {
    throw new Error(
      'Un plafond historique du manifeste a disparu; il ne sera pas recréé implicitement.',
    );
  }

  for (const actuel of plafondsActuels) {
    const plafondManifeste = plafondsManifestes.find(
      (plafond) =>
        plafond.acteID === acteId &&
        plafond.porteePlafond === actuel.porteePlafond,
    );
    const existant = await prisma.plafond.findFirst({
      where: {
        acteID: acteId,
        porteePlafond: actuel.porteePlafond,
        dateEffet: dateUtc(DATE_EFFET_PLAFONDS_TEST),
        dateFin: dateUtc(DATE_FIN_PLAFONDS_TEST),
      },
    });
    if (existant !== null) {
      if (
        !manifest.createdPlafondIds.includes(existant.id) ||
        existant.unite !== actuel.unite ||
        existant.montant?.toString() !== actuel.montant?.toString() ||
        existant.nbSeances !== actuel.nbSeances
      ) {
        throw new Error(
          `Le plafond historique REA-02 ${existant.id} n’appartient pas au seed ou n’est plus conforme.`,
        );
      }
      continue;
    }
    if (plafondManifeste !== undefined) {
      throw new Error(
        `Le plafond historique de portée ${actuel.porteePlafond} n’a plus ses dates attendues.`,
      );
    }

    const cree = await prisma.plafond.create({
      data: {
        porteePlafond: actuel.porteePlafond,
        unite: actuel.unite,
        dateEffet: dateUtc(DATE_EFFET_PLAFONDS_TEST),
        dateFin: dateUtc(DATE_FIN_PLAFONDS_TEST),
        montant: actuel.montant,
        nbSeances: actuel.nbSeances,
        acteID: actuel.acteID,
        categorieActeID: actuel.categorieActeID,
      },
      select: { id: true },
    });
    manifest.createdPlafondIds.push(cree.id);
    await ecrireManifeste(manifest);
  }
}

async function assurerRegleEtUtilisateurs(
  prisma: PrismaService,
  regles: RegleService,
  manifest: ManifestSeed,
): Promise<void> {
  const aujourdHui = new Date();
  aujourdHui.setUTCHours(0, 0, 0, 0);
  const regle = await prisma.regle.findFirst({
    where: {
      agentConcerne: AgentConcerne.ACTIF,
      dateEffet: { lte: aujourdHui },
      OR: [{ dateFin: null }, { dateFin: { gte: aujourdHui } }],
    },
    orderBy: [{ dateEffet: 'desc' }, { id: 'desc' }],
    select: { id: true },
  });
  if (regle === null) {
    const creee = await regles.creer({
      type: TypeRegle.REPARTITION_AGENT_CEM,
      agentConcerne: AgentConcerne.ACTIF,
      tauxCem: 80,
      dateEffet: aujourdHui.toISOString().slice(0, 10),
    });
    manifest.createdRuleIds.push(creee.id);
    await ecrireManifeste(manifest);
  }

  let utilisateurCree = false;
  for (const definition of STATUTS_UTILISATEURS) {
    const existant = await prisma.utilisateur.findUnique({
      where: { id: definition.id },
      select: { id: true, role: true },
    });
    if (existant !== null) {
      if (existant.role !== definition.role) {
        throw new Error(
          `L’utilisateur ${definition.id} existe avec un rôle incompatible; aucune donnée ne sera modifiée.`,
        );
      }
      continue;
    }
    await prisma.utilisateur.create({
      data: {
        id: definition.id,
        nom: prefixe(definition.nom),
        role: definition.role,
      },
    });
    manifest.createdUserIds.push(definition.id);
    utilisateurCree = true;
    await ecrireManifeste(manifest);
  }
  if (utilisateurCree) {
    await prisma.$queryRaw`
      SELECT setval(
        pg_get_serial_sequence('"utilisateur"."utilisateur"', 'id'),
        GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "utilisateur"."utilisateur"), 1),
        true
      )
    `;
  }
}

async function assurerCategoriePrestataire(
  prisma: PrismaService,
): Promise<number> {
  const nom = prefixe('CATEGORIE-PRESTATAIRE');
  const categories = await prisma.categoriePrestataire.findMany({
    where: { nom },
    select: { id: true },
    take: 2,
  });
  if (categories.length > 1) {
    throw new Error(`Plusieurs catégories ${nom} existent déjà.`);
  }
  if (categories[0] !== undefined) return categories[0].id;
  const categorie = await prisma.categoriePrestataire.create({
    data: { nom },
    select: { id: true },
  });
  return categorie.id;
}

async function assurerPrestataires(
  prisma: PrismaService,
  lieuId: number,
  categorieId: number,
): Promise<PrestataireSeed[]> {
  const specifications = [
    { nom: prefixe('Clinique-Ravinala'), adresse: 'Mahamasina, Antananarivo' },
    { nom: prefixe('Hopital-Anosy'), adresse: 'Anosy, Antananarivo' },
    {
      nom: prefixe('Laboratoire-Haute-Ville'),
      adresse: 'Ambohijatovo, Antananarivo',
    },
  ];
  const prestataires: PrestataireSeed[] = [];

  for (const [index, specification] of specifications.entries()) {
    const nif = prefixe(`NIF-${index + 1}`);
    const stat = prefixe(`STAT-${index + 1}`);
    const existant = await prisma.prestataire.findUnique({
      where: { nif },
      select: {
        id: true,
        nom: true,
        stat: true,
        lieuID: true,
        categorieID: true,
      },
    });
    if (existant !== null) {
      if (
        existant.nom !== specification.nom ||
        existant.stat !== stat ||
        existant.lieuID !== lieuId ||
        existant.categorieID !== categorieId
      ) {
        throw new Error(
          `Le prestataire ${nif} existe mais ses données ne correspondent pas au seed.`,
        );
      }
      prestataires.push({ id: existant.id, nom: existant.nom });
      continue;
    }
    const statExistant = await prisma.prestataire.findUnique({
      where: { stat },
      select: { id: true },
    });
    if (statExistant !== null) {
      throw new Error(
        `Le STAT ${stat} est déjà utilisé par un autre prestataire.`,
      );
    }
    const prestataire = await prisma.prestataire.create({
      data: {
        nom: specification.nom,
        adresse: specification.adresse,
        statut: StatutPrestataire.PRIVE,
        nif,
        stat,
        dateDebutConvention: dateUtc('2020-01-01'),
        dateFinConvention: dateUtc('2099-12-31'),
        listePrestation: CODES_ACTES.join(', '),
        conventionPath: prefixe(`CONVENTION-${index + 1}`),
        lieuID: lieuId,
        categorieID: categorieId,
      },
      select: { id: true, nom: true },
    });
    prestataires.push(prestataire);
  }
  return prestataires;
}

async function assurerPersonne(
  prisma: PrismaService,
  specification: (typeof PERSONNES)[number],
): Promise<number> {
  verifierLongueur(specification.nom, 25, 'Nom de personne');
  const personnes = await prisma.personne.findMany({
    where: { nom: specification.nom, prenom: specification.prenom },
    select: { id: true, dateNaissance: true, sexe: true },
    take: 2,
  });
  if (personnes.length > 1) {
    throw new Error(
      `Plusieurs personnes ${specification.nom} ${specification.prenom} existent déjà.`,
    );
  }
  if (personnes[0] !== undefined) {
    if (
      personnes[0].dateNaissance.toISOString().slice(0, 10) !==
        specification.naissance ||
      personnes[0].sexe !== specification.sexe
    ) {
      throw new Error(
        `La personne ${specification.nom} ${specification.prenom} a des données différentes du seed.`,
      );
    }
    return personnes[0].id;
  }
  const personne = await prisma.personne.create({
    data: {
      nom: specification.nom,
      prenom: specification.prenom,
      dateNaissance: dateUtc(specification.naissance),
      sexe: specification.sexe,
    },
    select: { id: true },
  });
  return personne.id;
}

async function assurerBeneficiaires(
  prisma: PrismaService,
): Promise<BeneficiaireSeed[]> {
  const beneficiaires: BeneficiaireSeed[] = [];
  for (const [index, specification] of PERSONNES.entries()) {
    const id = await assurerPersonne(prisma, specification);
    if (index < 6) {
      const matricule = MATRICULE_AGENT_BASE + index;
      const agentExistant = await prisma.agent.findUnique({
        where: { matricule },
        select: { id: true, observationMatricule: true },
      });
      if (agentExistant === null) {
        await prisma.agent.create({
          data: {
            id,
            matricule,
            observationMatricule: prefixe(`MATRICULE-${index + 1}`),
            carteProfessionnellePath: prefixe(`CARTE-PRO-${index + 1}.jpg`),
            dateEntree: dateUtc('2012-01-01'),
            statutPEC: StatutPEC.AGENT,
            agentType: AgentType.AGENT_ACTIF,
            structureID: STRUCTURE_ID,
            serviceID: SERVICE_ID,
            fonction: prefixe(`FONCTION-${index + 1}`),
          },
        });
      } else if (
        agentExistant.id !== id ||
        agentExistant.observationMatricule !== prefixe(`MATRICULE-${index + 1}`)
      ) {
        throw new Error(
          `Le matricule ${matricule} existe hors des données de ce seed.`,
        );
      }
    } else {
      const indexAgent = index === 6 ? 0 : 1;
      const matriculeAgent = MATRICULE_AGENT_BASE + indexAgent;
      const famille = await prisma.familleAgent.findUnique({
        where: { id },
        select: { agentMatricule: true, carteSocialePath: true },
      });
      if (famille === null) {
        const path = prefixe(`CARTE-SOCIALE-${index + 1}.jpg`);
        verifierLongueur(path, 100, 'Chemin de carte sociale');
        await prisma.familleAgent.create({
          data: {
            id,
            agentMatricule: matriculeAgent,
            carteSocialePath: path,
          },
        });
        if (index === 6) {
          await prisma.conjoint.create({ data: { id } });
        } else {
          await prisma.enfant.create({ data: { id } });
        }
      } else if (
        famille.agentMatricule !== matriculeAgent ||
        famille.carteSocialePath !== prefixe(`CARTE-SOCIALE-${index + 1}.jpg`)
      ) {
        throw new Error(
          `La relation familiale ${specification.nom} ${specification.prenom} existe hors des données de ce seed.`,
        );
      }
    }

    const idp = prefixe(`IDP-${String(index + 1).padStart(4, '0')}`);
    const beneficiaireExistant = await prisma.beneficiaire.findUnique({
      where: { idp },
      select: { id: true },
    });
    if (beneficiaireExistant === null) {
      await prisma.beneficiaire.create({ data: { id, idp } });
    } else if (beneficiaireExistant.id !== id) {
      throw new Error(`L’IDP ${idp} appartient à une autre personne.`);
    }
    beneficiaires.push({
      id,
      idp,
      nom: specification.nom,
      prenom: specification.prenom,
    });
  }
  return beneficiaires;
}

async function assurerAttestation(
  prisma: PrismaService,
  scenario: Scenario,
  prestataires: PrestataireSeed[],
  beneficiaires: BeneficiaireSeed[],
  nomsActes: Map<string, string>,
  referenceOverride?: string,
): Promise<number | null> {
  if (scenario.attestation === undefined) return null;
  const details = scenario.attestation;
  const reference = referenceOverride ?? prefixe(`AT-${scenario.code}`);
  const prestataireIndex =
    details.prestataireIndex ?? scenario.prestataireIndex;
  const beneficiaireIndex =
    details.beneficiaireIndex ?? scenario.beneficiaireIndex;
  const naturePrestation =
    details.naturePrestation ??
    (details.natureCode === undefined
      ? nomsActes.get(scenario.actes[0]!)
      : nomsActes.get(details.natureCode));
  if (naturePrestation === undefined) {
    throw new Error(`La nature de l’attestation ${reference} est indéfinie.`);
  }
  const statut = details.statut ?? StatutAttestation.VALIDEE;
  const statutUtilisation =
    details.statutUtilisation ?? StatutUtilisationAttestation.JOINTE_A_FACTURE;
  const datePEC = details.datePEC ?? DATE_PEC;
  const existante = await prisma.attestation.findUnique({
    where: { reference },
    select: {
      id: true,
      prestataireID: true,
      idpBeneficiaire: true,
      naturePrestation: true,
      statut: true,
      statutUtilisation: true,
      datePEC: true,
    },
  });
  if (existante !== null) {
    if (
      existante.prestataireID !== prestataires[prestataireIndex]!.id ||
      existante.idpBeneficiaire !== beneficiaires[beneficiaireIndex]!.idp ||
      existante.naturePrestation !== naturePrestation ||
      existante.statut !== statut ||
      existante.statutUtilisation !== statutUtilisation ||
      existante.datePEC.toISOString().slice(0, 10) !== datePEC
    ) {
      await prisma.attestation.update({
        where: { id: existante.id },
        data: {
          prestataireID: prestataires[prestataireIndex]!.id,
          idpBeneficiaire: beneficiaires[beneficiaireIndex]!.idp,
          naturePrestation,
          statut,
          statutUtilisation,
          datePEC: dateUtc(datePEC),
          dateValidation:
            statut === StatutAttestation.VALIDEE ? dateUtc('2026-01-11') : null,
        },
      });
    }
    return existante.id;
  }

  const attestation = await prisma.attestation.create({
    data: {
      reference,
      prestataireID: prestataires[prestataireIndex]!.id,
      idpBeneficiaire: beneficiaires[beneficiaireIndex]!.idp,
      naturePrestation,
      statut,
      statutUtilisation,
      datePEC: dateUtc(datePEC),
      dateValidation:
        statut === StatutAttestation.VALIDEE ? dateUtc('2026-01-11') : null,
    },
    select: { id: true },
  });
  return attestation.id;
}

async function assurerFacture(
  prisma: PrismaService,
  service: FactureGlobaleService,
  scenario: Scenario,
  prestataires: PrestataireSeed[],
): Promise<{ id: number; statut: StatutFacture; dateCloture: Date | null }> {
  const prestataire = prestataires[scenario.prestataireIndex]!;
  const numFacture = prefixe(scenario.code);
  const dateFacture = scenario.dateFacture ?? DATE_FACTURE;
  const dateReception = scenario.dateReception ?? DATE_RECEPTION;
  const moisPrestation =
    scenario.moisPrestation ?? `${dateFacture.slice(0, 7)}-01`;
  const existantes = await prisma.factureGlobale.findMany({
    where: { prestataireId: prestataire.id, numFacture },
    select: {
      id: true,
      prestataireId: true,
      dateFacture: true,
      dateReception: true,
      montantTotal: true,
      remarque: true,
      statut: true,
      dateCloture: true,
    },
    take: 2,
  });
  if (existantes.length > 1) {
    throw new Error(`Plusieurs factures ${numFacture} existent déjà.`);
  }

  let facture = existantes[0];
  if (facture === undefined) {
    const creee = await service.creer(
      {
        prestataireId: prestataire.id,
        numFacture,
        dateFacture,
        dateReception,
        moisPrestation,
      },
      ID_UTILISATEUR_OPERATEUR,
    );
    const acteur: ActeurFacture = {
      id: ID_UTILISATEUR_OPERATEUR,
      role: RoleUtilisateur.OPERATEUR,
    };
    await service.modifierInformations(creee.id, acteur, {
      montantTotal: scenario.montantTotal,
      moisPrestation,
      remarque: prefixe(`SCENARIO-${scenario.code}`),
      motif: prefixe(`INITIALISATION-${scenario.code}`),
    });
    facture = await prisma.factureGlobale.findUniqueOrThrow({
      where: { id: creee.id },
      select: {
        id: true,
        prestataireId: true,
        dateFacture: true,
        dateReception: true,
        montantTotal: true,
        remarque: true,
        statut: true,
        dateCloture: true,
      },
    });
  } else if (
    facture.dateFacture.toISOString().slice(0, 10) !== dateFacture ||
    facture.dateReception.toISOString().slice(0, 10) !== dateReception ||
    facture.remarque !== prefixe(`SCENARIO-${scenario.code}`)
  ) {
    throw new Error(
      `La facture ${numFacture} existe mais ses données ne correspondent pas au seed; lancez --clean avant de la recréer.`,
    );
  }

  const enregistrement = await prisma.mouvementFacture.count({
    where: {
      factureGlobaleId: facture.id,
      type: 'ENREGISTREMENT',
    },
  });
  if (enregistrement === 0) {
    throw new Error(
      `La facture ${numFacture} ne possède pas le mouvement ENREGISTREMENT attendu.`,
    );
  }
  return {
    id: facture.id,
    statut: facture.statut,
    dateCloture: facture.dateCloture,
  };
}

async function appliquerStatutScenario(
  prisma: PrismaService,
  cloture: CloturePaieService,
  scenario: Scenario,
  factureId: number,
): Promise<void> {
  if (scenario.statutFacture === undefined) return;
  const facture = await prisma.factureGlobale.findUniqueOrThrow({
    where: { id: factureId },
    select: { statut: true, dateCloture: true, moisPaie: true },
  });
  if (scenario.cloturee !== true && facture.dateCloture !== null) {
    throw new Error(`${scenario.code} ne doit pas être clôturée.`);
  }
  if (facture.statut !== scenario.statutFacture) {
    await prisma.factureGlobale.update({
      where: { id: factureId },
      data:
        scenario.statutFacture === StatutFacture.VALIDEE
          ? {
              statut: scenario.statutFacture,
              dateValidation: dateUtc(scenario.dateReception ?? DATE_RECEPTION),
              valideParId: ID_UTILISATEUR_CHEF,
            }
          : { statut: scenario.statutFacture },
    });
  }
  if (scenario.cloturee === true) {
    const moisCloture = scenario.moisCloture ?? '2026-11';
    const dateCloture = scenario.dateCloture ?? '2026-11-16';
    if (facture.dateCloture === null) {
      await cloture.cloturer(
        factureId,
        moisCloture,
        dateCloture,
        ID_UTILISATEUR_CHEF,
      );
    } else if (
      facture.dateCloture.toISOString().slice(0, 10) !== dateCloture ||
      facture.moisPaie?.toISOString().slice(0, 10) !== `${moisCloture}-01`
    ) {
      throw new Error(`${scenario.code} a une clôture différente du scénario.`);
    }
  }
}

async function reinitialiserDonneesT6(
  prisma: PrismaService,
  factureIds: Map<string, number>,
): Promise<void> {
  const tousLesIds = [...factureIds.values()];
  const idsT6 = [...SCENARIOS_T6].map((code) => {
    const id = factureIds.get(code);
    if (id === undefined) throw new Error(`Facture ${code} introuvable.`);
    return id;
  });
  const decisions = await prisma.decisionPriseEnCharge.count({
    where: { factureIndividuelle: { factureGlobaleId: { in: idsT6 } } },
  });
  if (decisions !== 0) {
    throw new Error(
      `Réinitialisation DEMO-IA interrompue : ${decisions} décision(s) T6 existent déjà sur les factures ciblées.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.ligneSuivi.deleteMany({
      where: { factureGlobaleId: { in: idsT6 } },
    });
    await tx.factureIndividuelle.deleteMany({
      where: { factureGlobaleId: { in: idsT6 } },
    });
    await tx.controleVisuelFacture.deleteMany({
      where: { factureGlobaleId: { in: tousLesIds } },
    });
    await tx.mouvementFacture.deleteMany({
      where: {
        factureGlobaleId: { in: idsT6 },
        type: TypeMouvement.CLOTURE,
      },
    });
    await tx.factureGlobale.updateMany({
      where: { id: { in: idsT6 } },
      data: {
        statut: StatutFacture.ENREGISTREE,
        dateValidation: null,
        valideParId: null,
        moisPaie: null,
        dateCloture: null,
      },
    });
  });
}

async function creerLignesT5T6(
  prisma: PrismaService,
  factureIndividuelle: FactureIndividuelleService,
  suivi: SuiviService,
  factureIds: Map<string, number>,
  attestationLigneIds: Map<string, number>,
  beneficiaires: BeneficiaireSeed[],
  idsActes: Map<string, number>,
  nomsActes: Map<string, string>,
): Promise<void> {
  const acteur: ActeurFacture = {
    id: ID_UTILISATEUR_OPERATEUR,
    role: RoleUtilisateur.OPERATEUR,
  };
  const scenarios = SCENARIOS.filter((scenario) =>
    SCENARIOS_T6.has(scenario.code),
  );
  const idsCibles = scenarios.map((scenario) => {
    const id = factureIds.get(scenario.code);
    if (id === undefined)
      throw new Error(`Facture ${scenario.code} introuvable.`);
    return id;
  });

  await prisma.controleVisuelFacture.createMany({
    data: scenarios.map((scenario) => ({
      factureGlobaleId: factureIds.get(scenario.code)!,
      statut: StatutControleVisuel.CONFORME,
      score: '100',
      lanceParId: ID_UTILISATEUR_OPERATEUR,
      confirmeParId: ID_UTILISATEUR_CHEF,
      confirmeLe: dateUtc(scenario.dateReception ?? DATE_RECEPTION),
    })),
  });

  const lignes: LigneT6T5Seed[] = [];
  for (const scenario of scenarios) {
    if (scenario.actes.length < 2 || scenario.actes.length > 4) {
      throw new Error(`${scenario.code} doit contenir 2 à 4 lignes T6.`);
    }
    if (scenario.attestation === undefined) {
      throw new Error(
        `${scenario.code} requiert une attestation pour les lignes T6.`,
      );
    }
    const factureId = factureIds.get(scenario.code)!;
    const beneficiaire = beneficiaires[scenario.beneficiaireIndex]!;
    const dateFacture = scenario.dateFacture ?? DATE_FACTURE;
    const dateActe = dateFacture;
    const moisPrestation =
      scenario.moisPrestation ?? `${dateFacture.slice(0, 7)}-01`;
    if (
      dateActe > dateFacture ||
      dateActe.slice(0, 7) !== moisPrestation.slice(0, 7)
    ) {
      throw new Error(`${scenario.code} a une date d’acte hors prestation.`);
    }
    const montantActe = scenario.montantTotal / scenario.actes.length;
    if (!Number.isInteger(montantActe)) {
      throw new Error(`${scenario.code} a un montant par ligne non entier.`);
    }

    for (const [index, codeActe] of scenario.actes.entries()) {
      const attestationId = attestationLigneIds.get(
        `${scenario.code}-${index + 1}`,
      );
      if (attestationId === undefined) {
        throw new Error(
          `L’attestation de la ligne ${index + 1} de ${scenario.code} est introuvable.`,
        );
      }
      if (codeActe !== 'REA-02') {
        throw new Error(
          `Le plafond de test n’est pas défini pour l’acte ${codeActe}.`,
        );
      }
      const acteId = idsActes.get(codeActe);
      const libelle = nomsActes.get(codeActe);
      if (acteId === undefined || libelle === undefined) {
        throw new Error(`L’acte de référence ${codeActe} est introuvable.`);
      }
      const feuille = await suivi.creer(factureId, acteur, {
        idp: beneficiaire.idp,
        acteId,
        dateActe,
        montantActe,
        libelle,
      });
      const ligneSuivi = await prisma.ligneSuivi.findFirst({
        where: {
          factureGlobaleId: factureId,
          acteId,
          dateActe: dateUtc(dateActe),
        },
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const calculee = feuille.lignes.find(
        (ligne) => ligne.id === ligneSuivi?.id,
      );
      if (ligneSuivi === null || calculee === undefined) {
        throw new Error(`Le calcul T5 de ${scenario.code} est introuvable.`);
      }
      lignes.push({
        scenarioCode: scenario.code,
        factureId,
        attestationId,
        beneficiaireId: beneficiaire.id,
        idp: beneficiaire.idp,
        acteId,
        codeActe,
        dateActe,
        montantActe,
        montantDepassementActe: Number(calculee.depassementActe ?? '0'),
        montantDepassementPlafond: Number(calculee.depassementPlafond ?? '0'),
        refPaie:
          scenario.lignesAvecRefPaie?.includes(index + 1) === true
            ? (scenario.refPaie ?? null)
            : null,
      });
    }
  }

  if (
    !lignes.some((ligne) => ligne.montantDepassementActe > 0) ||
    !lignes.some((ligne) => ligne.montantDepassementPlafond > 0)
  ) {
    throw new Error(
      'Le jeu DEMO-IA doit consommer les plafonds par acte et annuels réels.',
    );
  }

  for (const ligne of lignes) {
    await factureIndividuelle.creer(ligne.factureId, acteur, {
      libelle: nomsActes.get(ligne.codeActe)!,
      dateActe: ligne.dateActe,
      idp: ligne.idp,
      acteId: ligne.acteId,
      numPec: ligne.attestationId,
      montantActe: ligne.montantActe,
      montantDepassementActe: ligne.montantDepassementActe,
      montantDepassementPlafond: ligne.montantDepassementPlafond,
      ...(ligne.refPaie === null ? {} : { refPaie: ligne.refPaie }),
    });
  }

  const totalT6 = await prisma.factureIndividuelle.count({
    where: { factureGlobaleId: { in: idsCibles } },
  });
  const totalT5 = await prisma.ligneSuivi.count({
    where: { factureGlobaleId: { in: idsCibles } },
  });
  if (totalT6 !== lignes.length || totalT5 !== lignes.length) {
    throw new Error(
      `Nombre de lignes inattendu : T6=${totalT6}, T5=${totalT5}, attendu=${lignes.length}.`,
    );
  }
}

function sommeMontants(valeurs: readonly { toString(): string }[]): number {
  const centimes = valeurs.reduce<number>(
    (somme, valeur) => somme + Math.round(Number(valeur.toString()) * 100),
    0,
  );
  return Number((centimes / 100).toFixed(2));
}

async function actualiserTotauxT6(
  prisma: PrismaService,
  service: FactureGlobaleService,
  factureIds: Map<string, number>,
): Promise<void> {
  const acteur: ActeurFacture = {
    id: ID_UTILISATEUR_OPERATEUR,
    role: RoleUtilisateur.OPERATEUR,
  };
  for (const scenario of SCENARIOS.filter((item) =>
    SCENARIOS_T6.has(item.code),
  )) {
    const factureId = factureIds.get(scenario.code)!;
    const lignes = await prisma.factureIndividuelle.findMany({
      where: { factureGlobaleId: factureId },
      select: {
        montantActe: true,
        montantCemIntegral: true,
        montantDepassementActe: true,
        montantDepassementPlafond: true,
      },
    });
    const montantTotal = sommeMontants(
      lignes.map((ligne) => ligne.montantActe),
    );
    const total100Cem = sommeMontants(
      lignes.map((ligne) => ligne.montantCemIntegral),
    );
    const totalDepassement = sommeMontants(
      lignes.flatMap((ligne) => [
        ligne.montantDepassementActe,
        ligne.montantDepassementPlafond,
      ]),
    );
    const dateFacture = scenario.dateFacture ?? DATE_FACTURE;
    const moisPrestation =
      scenario.moisPrestation ?? `${dateFacture.slice(0, 7)}-01`;
    const facture = await prisma.factureGlobale.findUniqueOrThrow({
      where: { id: factureId },
      select: {
        montantTotal: true,
        total100Cem: true,
        totalDepassement: true,
        moisPrestation: true,
        remarque: true,
      },
    });
    const dejaConforme =
      facture.montantTotal?.toNumber() === montantTotal &&
      facture.total100Cem?.toNumber() === total100Cem &&
      facture.totalDepassement?.toNumber() === totalDepassement &&
      facture.moisPrestation?.toISOString().slice(0, 10) === moisPrestation &&
      facture.remarque === prefixe(`SCENARIO-${scenario.code}`);
    if (!dejaConforme) {
      await service.modifierInformations(factureId, acteur, {
        montantTotal,
        total100Cem,
        totalDepassement,
        moisPrestation,
        remarque: prefixe(`SCENARIO-${scenario.code}`),
        motif: prefixe(`PHASE2-TOTAUX-${scenario.code}`),
      });
    }
  }

  const factureS17Id = factureIds.get('S17');
  if (factureS17Id === undefined) {
    throw new Error('Facture S17 introuvable.');
  }
  const ligneS17 = await prisma.factureIndividuelle.findFirst({
    where: { factureGlobaleId: factureS17Id },
    orderBy: { numLigne: 'asc' },
    select: { id: true, montantActe: true },
  });
  if (ligneS17 === null) throw new Error('Ligne T6 de S17 introuvable.');
  await prisma.factureIndividuelle.update({
    where: { id: ligneS17.id },
    data: { montantActe: ligneS17.montantActe.plus(1000) },
  });
}

async function creerPieceScenario(
  prisma: PrismaService,
  storage: FileStorageService,
  manifest: ManifestSeed,
  scenario: Scenario,
  factureId: number,
  attestationId: number | null,
  pdfBuffer: Buffer,
  imageBuffer: Buffer | null,
): Promise<void> {
  const pdfPath = await assurerPdfStocke(
    storage,
    manifest,
    scenario.code,
    pdfBuffer,
  );
  if (scenario.piece === 'aucune') {
    const pieces = await prisma.pieceJointeFacture.count({
      where: { factureGlobaleId: factureId },
    });
    if (pieces !== 0) {
      throw new Error(`${scenario.code} doit rester sans pièce jointe.`);
    }
    return;
  }
  if (attestationId === null) {
    throw new Error(`${scenario.code} requiert une attestation rattachée.`);
  }

  if (scenario.piece === 'pdf') {
    const storedPath = pdfPath;
    const taille = (await stat(join(STORAGE_SETTINGS.root, storedPath))).size;
    await enregistrerChemin(manifest, `piece:${scenario.code}`, storedPath);
    await assurerPieceJointe(
      prisma,
      manifest,
      scenario,
      factureId,
      attestationId,
      {
        nom: prefixe(`${scenario.code}.pdf`),
        type: 'application/pdf',
        tailleOctets: taille,
        path: storedPath,
      },
      `piece:${scenario.code}`,
    );
    return;
  }

  if (imageBuffer === null) {
    throw new Error(`L’image de ${scenario.code} n’a pas été générée.`);
  }
  const imagePath = await assurerImageStockee(
    storage,
    manifest,
    scenario.code,
    imageBuffer,
  );
  const imageTaille = (await stat(join(STORAGE_SETTINGS.root, imagePath))).size;
  await assurerPieceJointe(
    prisma,
    manifest,
    scenario,
    factureId,
    attestationId,
    {
      nom: prefixe(`${scenario.code}.jpg`),
      type: 'image/jpeg',
      tailleOctets: imageTaille,
      path: imagePath,
    },
    `piece:${scenario.code}`,
  );
}

async function compterDonnees(prisma: PrismaService, manifest: ManifestSeed) {
  const factures = await prisma.factureGlobale.findMany({
    where: { numFacture: { startsWith: PREFIXE } },
    select: { id: true },
  });
  const factureIds = factures.map((facture) => facture.id);
  const personnes = await prisma.personne.findMany({
    where: { nom: { startsWith: PREFIXE } },
    select: { id: true },
  });
  const personneIds = personnes.map((personne) => personne.id);
  const categories = await prisma.categoriePrestataire.count({
    where: { nom: { startsWith: PREFIXE } },
  });
  const prestataires = await prisma.prestataire.count({
    where: {
      nif: { startsWith: PREFIXE },
      stat: { startsWith: PREFIXE },
    },
  });
  const users = await prisma.utilisateur.count({
    where: {
      id: {
        in: [
          ID_UTILISATEUR_OPERATEUR,
          ID_UTILISATEUR_ADJOINT,
          ID_UTILISATEUR_CHEF,
        ],
      },
      nom: { startsWith: PREFIXE },
    },
  });
  const regles = manifest.createdRuleIds.length
    ? await prisma.regle.count({
        where: { id: { in: manifest.createdRuleIds } },
      })
    : 0;

  return {
    regle: regles,
    utilisateur: users,
    categorie_prestataire: categories,
    prestataire: prestataires,
    personne: personnes.length,
    agent: await prisma.agent.count({ where: { id: { in: personneIds } } }),
    famille_agent: await prisma.familleAgent.count({
      where: { id: { in: personneIds } },
    }),
    conjoint: await prisma.conjoint.count({
      where: { id: { in: personneIds } },
    }),
    enfant: await prisma.enfant.count({ where: { id: { in: personneIds } } }),
    beneficiaire: await prisma.beneficiaire.count({
      where: { idp: { startsWith: PREFIXE } },
    }),
    attestation: await prisma.attestation.count({
      where: { reference: { startsWith: PREFIXE } },
    }),
    facture_globale: factures.length,
    piece_jointe_facture: await prisma.pieceJointeFacture.count({
      where: { factureGlobaleId: { in: factureIds } },
    }),
    mouvement_facture: await prisma.mouvementFacture.count({
      where: { factureGlobaleId: { in: factureIds } },
    }),
    controle_visuel_facture: await prisma.controleVisuelFacture.count({
      where: { factureGlobaleId: { in: factureIds } },
    }),
    plafond_test: await prisma.plafond.count({
      where: { id: { in: manifest.createdPlafondIds } },
    }),
    facture_individuelle: await prisma.factureIndividuelle.count({
      where: { factureGlobaleId: { in: factureIds } },
    }),
    ligne_suivi: await prisma.ligneSuivi.count({
      where: { factureGlobaleId: { in: factureIds } },
    }),
  };
}

async function compterReferencesProtegees(
  prisma: PrismaService,
  plafondsSeedIds: number[],
) {
  return {
    actes: await prisma.acte.count(),
    categorie_actes: await prisma.categorieActe.count(),
    plafonds: await prisma.plafond.count({
      where: { id: { notIn: plafondsSeedIds } },
    }),
    lieux: await prisma.lieu.count(),
    services: await prisma.service.count(),
    directions: await prisma.direction.count(),
  };
}

function afficherComptages(
  label: string,
  valeurs: Record<string, number>,
): void {
  console.log(label);
  for (const [table, nombre] of Object.entries(valeurs)) {
    console.log(`  ${table}: ${nombre}`);
  }
}

async function genererDocumentation(
  prisma: PrismaService,
  factureIds: Map<string, number>,
): Promise<void> {
  const rows: string[][] = [];
  for (const scenario of SCENARIOS) {
    const facture = await prisma.factureGlobale.findUniqueOrThrow({
      where: { id: factureIds.get(scenario.code)! },
      select: {
        numFacture: true,
        piecesJointes: { select: { nomFichier: true } },
      },
    });
    const piece = facture.piecesJointes[0]?.nomFichier ?? 'Aucune';
    rows.push([
      scenario.code,
      String(factureIds.get(scenario.code)),
      `\`${facture.numFacture}\``,
      piece,
      resultatAttendu(scenario.code),
    ]);
  }

  const entetes = [
    'Scénario',
    'ID facture',
    'Numéro de facture',
    'Fichier joint',
    'Résultat attendu',
  ];
  const largeurs = entetes.map((entete, index) =>
    Math.max(entete.length, ...rows.map((row) => row[index].length)),
  );
  const formaterCellule = (valeur: string, index: number): string =>
    index === 1
      ? valeur.padStart(largeurs[index])
      : valeur.padEnd(largeurs[index]);
  const tableau = [
    `| ${entetes.map(formaterCellule).join(' | ')} |`,
    `| ${largeurs
      .map((largeur, index) =>
        index === 1 ? `${'-'.repeat(largeur - 1)}:` : '-'.repeat(largeur),
      )
      .join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(formaterCellule).join(' | ')} |`),
  ].join('\n');
  const contenu = `# Jeu de test IA — contrôle visuel des factures

Ce fichier est actualisé par \`npm run seed:jeu-test-ia\`. Les IDs numériques correspondent à la dernière exécution réussie; après \`--clean\`, relancer le seed pour les régénérer.

${tableau}

## Notes

- S16 est décliné en trois factures pour tester séparément \`VALIDEE\` clôturée, \`A_CORRIGER\` et \`RETOURNEE\`.
- Un PDF est généré et stocké pour chaque facture. S07 conserve son PDF hors de la facture pour rester sans pièce jointe; S15 conserve son PDF hors de la facture et joint uniquement l’image floue.
- S14 rapproche « Visite médicale générale » de la nature « Consultation généraliste ». Le score mesuré avec \`bge-m3:latest\` est d’environ 65 %, dans la plage attendue de 60 à 82 %.
- Seules S01, S16A et S17–S19 ont un contrôle visuel \`CONFORME\`, des lignes T6 et des lignes T5. Le seed crée 11 lignes pour chaque table; les autres factures n’en ont pas.
- Chaque ligne T6 possède une attestation de prise en charge distincte afin que les réponses API ne signalent pas de réutilisation d’attestation.
- S17 a une ligne T6 majorée de 1 000 Ariary après calcul des totaux afin de produire \`concordant: false\`. S18 est prête pour la paie de mars 2026 avec une référence de paie et sans mois d’affectation; S19 est clôturée via \`CloturePaieService\`.
- Deux plafonds historiques temporaires pour \`REA-02\` reprennent les valeurs réelles en vigueur au 14/11/2026 et s’appliquent du 01/01/2026 au 13/11/2026. Les plafonds actuels et les autres référentiels restent inchangés; \`--clean\` retire ces deux versions.
- Les trois référentiels de structure et le lieu sont lus en base, jamais créés ou modifiés. Les actes sont les codes existants \`CON-01\`, \`LAB-01\`, \`IMG-01\` et \`REA-02\`.
- Les scénarios S16 restent préparés pour leurs statuts; seules S16A reçoit les lignes de phase 2. Sa clôture passe par \`CloturePaieService\`.

Pour supprimer uniquement ces données et leurs fichiers : \`npm run seed:jeu-test-ia -- --clean\`.
`;
  await writeFile(join(process.cwd(), 'JEU-TEST-IA.md'), contenu, 'utf8');
}

function resultatAttendu(code: string): string {
  const resultats: Record<string, string> = {
    S01: '`CONFORME`, T6/T5 concordants',
    S02: '`MONTANT_FACTURE_DIFFERENT`',
    S03: '`MONTANT_CHIFFRES_LETTRES_DIFFERENT`',
    S04: '`DESTINATAIRE_INCORRECT`',
    S05: '`PRESTATAIRE_DIFFERENT`',
    S06: '`DATE_FACTURE_DIFFERENTE`',
    S07: '`PIECES_JOINTES_MANQUANTES`',
    S08: '`ATTESTATION_DEJA_CONSOMMEE`',
    S09: '`ATTESTATION_INVALIDE`',
    S10: '`ATTESTATION_PRESTATAIRE_DIFFERENT`',
    S11: '`ATTESTATION_APRES_FACTURE`',
    S12: '`ATTESTATION_BENEFICIAIRE_DIFFERENT`',
    S13: '`ATTESTATION_PAR_ACTE_INSUFFISANTE`',
    S14: '`ACTE_ATTESTATION_SEMANTIQUE_A_VERIFIER` (60–82 %)',
    S15: '`A_VERIFIER` (texte illisible)',
    S16A: 'Statut `VALIDEE`, clôturée, T6/T5 concordants',
    S16B: 'Statut `A_CORRIGER`',
    S16C: 'Statut `RETOURNEE`',
    S17: '`concordant: false` (montant T6 discordant)',
    S18: 'Statut `VALIDEE`, concordante; refPaie présente, affectation vide',
    S19: 'Facture clôturée; affectation et mouvement `CLOTURE` présents',
  };
  return resultats[code] ?? 'Résultat non défini';
}

async function nettoyer(
  prisma: PrismaService,
  storage: FileStorageService,
  manifest: ManifestSeed,
): Promise<void> {
  const factures = await prisma.factureGlobale.findMany({
    where: { numFacture: { startsWith: PREFIXE } },
    select: { id: true },
  });
  const factureIds = factures.map((facture) => facture.id);
  const pieces = factureIds.length
    ? await prisma.pieceJointeFacture.findMany({
        where: { factureGlobaleId: { in: factureIds } },
        select: {
          path: true,
          nomFichier: true,
          attestation: { select: { reference: true } },
        },
      })
    : [];
  for (const piece of pieces) {
    if (piece.nomFichier === null || !piece.nomFichier.startsWith(PREFIXE)) {
      throw new Error(
        'Nettoyage interrompu : une pièce jointe non DEMO-IA est liée à une facture de test.',
      );
    }
    if (
      piece.attestation !== null &&
      !piece.attestation.reference.startsWith(PREFIXE)
    ) {
      throw new Error(
        'Nettoyage interrompu : une attestation hors DEMO-IA est liée à une facture de test.',
      );
    }
    validerCheminStockage(piece.path);
  }
  if (factureIds.length > 0) {
    const [decisions, discussions] = await Promise.all([
      prisma.decisionPriseEnCharge.count({
        where: {
          factureIndividuelle: { factureGlobaleId: { in: factureIds } },
        },
      }),
      prisma.discussionFacture.count({
        where: { factureGlobaleId: { in: factureIds } },
      }),
    ]);
    if (decisions > 0 || discussions > 0) {
      throw new Error(
        `Nettoyage interrompu pour protéger les données liées : décisions=${decisions}, discussions=${discussions}.`,
      );
    }
  }

  for (const plafond of await prisma.plafond.findMany({
    where: { id: { in: manifest.createdPlafondIds } },
    select: { acteID: true, dateEffet: true, dateFin: true },
  })) {
    if (plafond.acteID === null || plafond.dateFin === null) {
      throw new Error(
        'Nettoyage interrompu : un plafond de test ne possède plus ses dates ou son acte attendu.',
      );
    }
    const lignesExternes = await prisma.ligneSuivi.count({
      where: {
        acteId: plafond.acteID,
        factureGlobaleId: { notIn: factureIds },
        dateActe: { gte: plafond.dateEffet, lte: plafond.dateFin },
      },
    });
    if (lignesExternes > 0) {
      throw new Error(
        `Nettoyage interrompu : ${lignesExternes} ligne(s) T5 hors DEMO-IA utilisent le plafond historique ${plafond.acteID}.`,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    const pattern = `${PREFIXE}%`;
    await tx.ligneSuivi.deleteMany({
      where: { factureGlobaleId: { in: factureIds } },
    });
    await tx.factureIndividuelle.deleteMany({
      where: { factureGlobaleId: { in: factureIds } },
    });
    await tx.controleVisuelFacture.deleteMany({
      where: {
        factureGlobale: { numFacture: { startsWith: PREFIXE } },
      },
    });
    await tx.plafond.deleteMany({
      where: { id: { in: manifest.createdPlafondIds } },
    });
    await tx.$executeRaw`
      DELETE FROM "facturation"."notification"
      WHERE "facture_globale_id" IN (
        SELECT "id" FROM "facturation"."facture_globale"
        WHERE "num_facture" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "facturation"."mouvement_facture"
      WHERE "facture_globale_id" IN (
        SELECT "id" FROM "facturation"."facture_globale"
        WHERE "num_facture" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "facturation"."piece_jointe_facture"
      WHERE "facture_globale_id" IN (
        SELECT "id" FROM "facturation"."facture_globale"
        WHERE "num_facture" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "facturation"."facture_globale"
      WHERE "num_facture" LIKE ${pattern}
    `;
    await tx.$executeRaw`
      DELETE FROM "pec"."attestations"
      WHERE "reference" LIKE ${pattern}
    `;
    await tx.$executeRaw`
      DELETE FROM "pec"."beneficiaires"
      WHERE "idp" LIKE ${pattern}
    `;
    await tx.$executeRaw`
      DELETE FROM "personnel"."conjoints"
      WHERE "id" IN (
        SELECT "id" FROM "identifiant"."personnes" WHERE "nom" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "personnel"."enfants"
      WHERE "id" IN (
        SELECT "id" FROM "identifiant"."personnes" WHERE "nom" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "personnel"."famille_agents"
      WHERE "id" IN (
        SELECT "id" FROM "identifiant"."personnes" WHERE "nom" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "personnel"."agents"
      WHERE "id" IN (
        SELECT "id" FROM "identifiant"."personnes" WHERE "nom" LIKE ${pattern}
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "identifiant"."personnes"
      WHERE "nom" LIKE ${pattern}
    `;
    await tx.$executeRaw`
      DELETE FROM "pec"."prestataires"
      WHERE "nom" LIKE ${pattern}
        AND "nif" LIKE ${pattern}
        AND "stat" LIKE ${pattern}
    `;
    await tx.$executeRaw`
      DELETE FROM "pec"."categories_prestataire" AS categorie
      WHERE categorie."nom" LIKE ${pattern}
        AND NOT EXISTS (
          SELECT 1 FROM "pec"."prestataires" AS prestataire
          WHERE prestataire."categorie_id" = categorie."id"
        )
    `;
    for (const userId of manifest.createdUserIds) {
      await tx.$executeRaw`
        DELETE FROM "utilisateur"."utilisateur"
        WHERE "id" = ${userId} AND "nom" LIKE ${pattern}
      `;
    }
    for (const definition of STATUTS_UTILISATEURS) {
      await tx.$executeRaw`
        DELETE FROM "utilisateur"."utilisateur"
        WHERE "id" = ${definition.id} AND "nom" LIKE ${pattern}
      `;
    }
    for (const ruleId of manifest.createdRuleIds) {
      await tx.$executeRaw`
        DELETE FROM "pec"."regle" WHERE "id" = ${ruleId}
      `;
    }
  });

  const chemins = new Set([
    ...manifest.filePaths,
    ...pieces.map((piece) => piece.path),
  ]);
  for (const path of chemins) {
    validerCheminStockage(path);
    await storage.deleteStoredFile(path);
  }
  try {
    await unlink(FICHIER_MANIFESTE);
  } catch (error: unknown) {
    if (!estErreurFichierAbsent(error)) throw error;
  }
  console.log('Nettoyage DEMO-IA terminé.');
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Seed refusé : définissez ALLOW_DEMO_SEED=true dans un environnement hors production.',
    );
  }
  const argumentsSeed = process.argv.slice(2);
  if (
    argumentsSeed.length > 1 ||
    (argumentsSeed.length === 1 && argumentsSeed[0] !== '--clean')
  ) {
    throw new Error('Option inconnue. Utilisez uniquement --clean.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const storage = app.get(FileStorageService);
  const manifest = await lireManifeste();
  try {
    if (argumentsSeed[0] === '--clean') {
      await nettoyer(prisma, storage, manifest);
      afficherComptages(
        'Lignes DEMO-IA après nettoyage :',
        await compterDonnees(prisma, nouveauManifeste()),
      );
      return;
    }

    const referencesAvant = await compterReferencesProtegees(
      prisma,
      manifest.createdPlafondIds,
    );
    const { lieuId, nomsActes, idsActes } = await obtenirReferences(prisma);
    await assurerRegleEtUtilisateurs(prisma, app.get(RegleService), manifest);
    const categorieId = await assurerCategoriePrestataire(prisma);
    const prestataires = await assurerPrestataires(prisma, lieuId, categorieId);
    const beneficiaires = await assurerBeneficiaires(prisma);
    const factureService = app.get(FactureGlobaleService);
    const factureIndividuelleService = app.get(FactureIndividuelleService);
    const suiviService = app.get(SuiviService);
    const clotureService = app.get(CloturePaieService);
    const factureIds = new Map<string, number>();
    const attestations = new Map<string, number | null>();
    const attestationsLignes = new Map<string, number>();

    for (const scenario of SCENARIOS) {
      attestations.set(
        scenario.code,
        await assurerAttestation(
          prisma,
          scenario,
          prestataires,
          beneficiaires,
          nomsActes,
        ),
      );
      const facture = await assurerFacture(
        prisma,
        factureService,
        scenario,
        prestataires,
      );
      factureIds.set(scenario.code, facture.id);
    }

    for (const scenario of SCENARIOS.filter((item) =>
      SCENARIOS_T6.has(item.code),
    )) {
      for (const [index] of scenario.actes.entries()) {
        const attestationId = await assurerAttestation(
          prisma,
          scenario,
          prestataires,
          beneficiaires,
          nomsActes,
          prefixe(`AT-${scenario.code}-T6-${index + 1}`),
        );
        if (attestationId === null) {
          throw new Error(
            `L’attestation de la ligne ${index + 1} de ${scenario.code} est introuvable.`,
          );
        }
        attestationsLignes.set(`${scenario.code}-${index + 1}`, attestationId);
      }
    }

    await reinitialiserDonneesT6(prisma, factureIds);
    const acteReaId = idsActes.get('REA-02');
    if (acteReaId === undefined) {
      throw new Error('L’acte REA-02 est introuvable.');
    }
    await assurerPlafondsTest(prisma, manifest, acteReaId);
    await creerLignesT5T6(
      prisma,
      factureIndividuelleService,
      suiviService,
      factureIds,
      attestationsLignes,
      beneficiaires,
      idsActes,
      nomsActes,
    );
    await actualiserTotauxT6(prisma, factureService, factureIds);

    for (const scenario of SCENARIOS) {
      const factureId = factureIds.get(scenario.code)!;
      await appliquerStatutScenario(
        prisma,
        clotureService,
        scenario,
        factureId,
      );
    }

    const browser: Browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      for (const scenario of SCENARIOS) {
        const html = fabriquerHtmlPdf(
          scenario,
          prestataires,
          beneficiaires,
          nomsActes,
        );
        const pdfBuffer = await genererPdf(page, html);
        const imageBuffer =
          scenario.piece === 'image' ? await genererImageFloue(page) : null;
        await creerPieceScenario(
          prisma,
          storage,
          manifest,
          scenario,
          factureIds.get(scenario.code)!,
          attestations.get(scenario.code) ?? null,
          pdfBuffer,
          imageBuffer,
        );
      }
    } finally {
      await browser.close();
    }

    const referencesApres = await compterReferencesProtegees(
      prisma,
      manifest.createdPlafondIds,
    );
    if (JSON.stringify(referencesAvant) !== JSON.stringify(referencesApres)) {
      throw new Error(
        'Un référentiel protégé a changé pendant le seed; vérifiez immédiatement la base.',
      );
    }
    const comptes = await compterDonnees(prisma, manifest);
    if (
      comptes.facture_individuelle !== 11 ||
      comptes.ligne_suivi !== 11 ||
      comptes.controle_visuel_facture !== SCENARIOS_T6.size ||
      comptes.plafond_test !== 2
    ) {
      throw new Error(
        `Données de phase 2 inattendues : T6=${comptes.facture_individuelle}, T5=${comptes.ligne_suivi}, contrôles=${comptes.controle_visuel_facture}, plafonds=${comptes.plafond_test}.`,
      );
    }
    if (comptes.facture_globale !== SCENARIOS.length) {
      throw new Error(
        'Le nombre de factures DEMO-IA ne correspond pas aux scénarios.',
      );
    }
    for (const code of ['S01', 'S16A', 'S18']) {
      const controle = await factureIndividuelleService.controleTotaux(
        factureIds.get(code)!,
      );
      if (!controle.concordant) {
        throw new Error(
          `Le contrôle des totaux de ${code} devrait être concordant.`,
        );
      }
    }
    const controleS17 = await factureIndividuelleService.controleTotaux(
      factureIds.get('S17')!,
    );
    if (controleS17.concordant) {
      throw new Error('Le contrôle des totaux de S17 devrait être discordant.');
    }
    await genererDocumentation(prisma, factureIds);
    afficherComptages('Lignes DEMO-IA après seed :', comptes);
    afficherComptages('Référentiels protégés (inchangés) :', referencesApres);
    console.log(
      `Documentation actualisée : ${join(process.cwd(), 'JEU-TEST-IA.md')}`,
    );
    console.log('Les contrôles visuels de phase 2 ont été précréés CONFORME.');
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Erreur inconnue pendant le seed.',
  );
  process.exitCode = 1;
});
