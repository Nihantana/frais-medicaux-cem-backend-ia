import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client.js';
import {
  AgentType,
  Sexe,
  StatutAttestation,
  StatutFacture,
  StatutPEC,
  StatutPrestataire,
  StatutUtilisationAttestation,
  StructureOrganisationnelleType,
  TypeMouvement,
} from '../src/generated/prisma/enums.js';
import { env } from '../src/common/settings/env.validator.js';

const dateUtc = (value: string) => new Date(`${value}T00:00:00.000Z`);

const providers = [
  ['Clinique Saint-Luc', 'Mahamasina, Antananarivo'],
  ['Polyclinique du Lycée', 'Faravohitra, Antananarivo'],
  ['Centre Hospitalier Universitaire Joseph Raseta Befelatanana', 'Ambatomena, Antananarivo'],
  ['Hôpital Joseph Ravoahangy Andrianavalona', 'Anosiala, Antananarivo'],
  ['Laboratoire Analyses Plus', 'Ambohijatovo, Antananarivo'],
  ['Imagerie Médicale d’Ivandry', 'Ivandry, Antananarivo'],
  ['Clinique Les Oliviers', 'Ambodivoanjo, Antananarivo'],
  ['Centre Médical CEM Ambatobe', 'Ambatobe, Antananarivo'],
] as const;

const agentFamilies = [
  ['RAKOTO', 'Andry', 'MASCULIN', 'I'],
  ['RAZAFINDRAKOTO', 'Lova', 'FEMININ', 'II'],
  ['RANDRIAMAHEFA', 'Tiana', 'MASCULIN', 'III'],
  ['ANDRIANIRINA', 'Hery', 'MASCULIN', 'IV'],
  ['RAVELONARIVO', 'Sitraka', 'MASCULIN', 'V'],
  ['RAJAONARISON', 'Ny Aina', 'FEMININ', 'VI'],
  ['RANDRIANASOLONIAINA', 'Zo', 'MASCULIN', 'VII'],
  ['RAZAFINJATO', 'Miala', 'FEMININ', 'VIII'],
  ['RABEARIVELO', 'Feno', 'MASCULIN', 'HCI'],
  ['ANDRIANTSITOHAINA', 'Miora', 'FEMININ', 'HCII'],
  ['RASAMIMANANA', 'Tojo', 'MASCULIN', 'HCIII'],
  ['RAKOTONIRINA', 'Volana', 'FEMININ', 'III'],
] as const;

const spouseNames = [
  ['RAKOTONIAINA', 'Mialy'],
  ['ANDRIAMANJATO', 'Faniry'],
  ['RAZAFINDRABE', 'Tsiry'],
  ['RAMAROSON', 'Lalaina'],
  ['RANDRIANARIVONY', 'Aina'],
  ['RAZANAKOLONA', 'Noro'],
] as const;

const childNames = [
  ['RAKOTO', 'Liantsoa'],
  ['RAZAFINDRAKOTO', 'Tahina'],
  ['RANDRIAMAHEFA', 'Kanto'],
  ['ANDRIANIRINA', 'Niry'],
  ['RAVELONARIVO', 'Soa'],
  ['RAJAONARISON', 'Tantely'],
  ['ANDRIANTSITOHAINA', 'Safidy'],
  ['RASAMIMANANA', 'Mirindra'],
] as const;

const invoiceLineCounts = [10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 120];
const statusCycle = [
  StatutFacture.ENREGISTREE,
  StatutFacture.EN_VALIDATION,
  StatutFacture.RETOURNEE,
  StatutFacture.A_CORRIGER,
  StatutFacture.VALIDEE,
] as const;

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  const catalogue = new Client({ connectionString: env.DATABASE_URL });

  try {
    await prisma.$connect();
    const acts = await prisma.acte.findMany({
      take: 40,
      orderBy: { id: 'asc' },
    });
    if (acts.length < 10) {
      await catalogue.connect();
      const sql = await readFile(
        resolve(process.cwd(), 'private-data', 'actes-et-plafonds.sql'),
        'utf8',
      );
      await catalogue.query(sql);
      await catalogue.end();
      catalogue.removeAllListeners();
      const reloaded = await prisma.acte.findMany({
        take: 40,
        orderBy: { id: 'asc' },
      });
      if (reloaded.length < 10) {
        throw new Error('Le catalogue des actes contient moins de 10 actes.');
      }
      acts.push(...reloaded.filter((act) => !acts.some((existing) => existing.id === act.id)));
    }

    let operator = await prisma.utilisateur.findFirst({
      where: { rolesAssignees: { some: { role: { code: 'ASSISTANT' } } } },
      select: { id: true },
    });
    if (operator === null) {
      operator = await prisma.utilisateur.create({
        data: { nom: 'Service authentification' },
        select: { id: true },
      });
    }
    const chief = await prisma.utilisateur.findFirst({
      where: { rolesAssignees: { some: { role: { code: 'CHEF_SERVICE' } } } },
      select: { id: true },
    });

    await prisma.categorieAgent.createMany({
      data: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'HCI', 'HCII', 'HCIII'].map(
        (codeCategory) => ({ codeCategory }),
      ),
      skipDuplicates: true,
    });

    await prisma.structureOrganisationnelle.upsert({
      where: { id: 'DG' },
      create: {
        id: 'DG',
        structureOrganisationnelleType: StructureOrganisationnelleType.DIRECTION,
      },
      update: {},
    });
    await prisma.direction.upsert({
      where: { codeDirection: 'DG' },
      create: { codeDirection: 'DG', nom: 'Direction générale' },
      update: { nom: 'Direction générale' },
    });

    const services = [
      ['DRH', 'Direction des ressources humaines', 'DG'],
      ['DAF', 'Direction administrative et financière', 'DG'],
      ['DSI', 'Direction des systèmes d’information', 'DG'],
      ['AUTH', 'Direction de l’authentification', 'DG'],
      ['CONT', 'Direction du contrôle', 'DG'],
    ];
    for (const [codeService, nom, codeDirection] of services) {
      await prisma.service.upsert({
        where: { codeService },
        create: { codeService, nom, codeDirection },
        update: { nom, codeDirection },
      });
    }

    const lieu = await prisma.lieu.findFirst({
      where: { nom: 'Antananarivo' },
    }).then((value) =>
      value ?? prisma.lieu.create({ data: { nom: 'Antananarivo' } }),
    );
    const providerCategory = await prisma.categoriePrestataire.findFirst({
      where: { nom: 'Clinique et hospitalisation' },
      select: { id: true },
    }).then((value) =>
      value ??
      prisma.categoriePrestataire.create({
        data: { nom: 'Clinique et hospitalisation' },
        select: { id: true },
      }),
    );

    const providerRows = [];
    for (const [index, provider] of providers.entries()) {
      const nif = `NIF-SOUTENANCE-${String(index + 1).padStart(2, '0')}`;
      const stat = `STAT-SOUTENANCE-${String(index + 1).padStart(2, '0')}`;
      const row = await prisma.prestataire.upsert({
        where: { nif },
        create: {
          nom: provider[0],
          adresse: provider[1],
          statut: index < 5 ? StatutPrestataire.PUBLIC : StatutPrestataire.PRIVE,
          nif,
          stat,
          dateDebutConvention: dateUtc('2024-01-01'),
          dateFinConvention: dateUtc('2027-12-31'),
          listePrestation: 'Consultations, examens, hospitalisation',
          conventionPath: `convention-soutenance-${index + 1}.pdf`,
          lieuID: lieu.id,
          categorieID: providerCategory.id,
        },
        update: {
          nom: provider[0],
          adresse: provider[1],
          lieuID: lieu.id,
          categorieID: providerCategory.id,
        },
        select: { id: true, nom: true },
      });
      providerRows.push(row);
    }

    const beneficiaries: Array<{ id: number; idp: string }> = [];
    for (const [index, family] of agentFamilies.entries()) {
      const matricule = 20260001 + index;
      const idp = `AG-${String(matricule).padStart(8, '0')}`;
      const existingAgentBeneficiary = await prisma.beneficiaire.findUnique({
        where: { idp },
        include: { personne: true },
      });
      const agentPerson = existingAgentBeneficiary?.personne ?? await prisma.personne.create({
        data: {
          nom: family[0],
          prenom: family[1],
          dateNaissance: dateUtc(`${1968 + (index % 12)}-${String(1 + (index % 9)).padStart(2, '0')}-${String(5 + (index % 20)).padStart(2, '0')}`),
          sexe: family[2] === 'MASCULIN' ? Sexe.MASCULIN : Sexe.FEMININ,
        },
      });
      await prisma.agent.upsert({
        where: { matricule },
        create: {
          id: agentPerson.id,
          matricule,
          carteProfessionnellePath: `cartes-sociales/agent-${matricule}.jpg`,
          dateEntree: dateUtc(`${2005 + (index % 15)}-01-02`),
          statutPEC: index === 9 ? StatutPEC.CHEF_SERVICE : index === 10 ? StatutPEC.DIRECTEUR : StatutPEC.AGENT,
          agentType: AgentType.AGENT_ACTIF,
          structureID: index % 3 === 0 ? 'DG' : null,
          serviceID: services[index % services.length][0],
          categorieID: family[3],
        },
        update: {
          serviceID: services[index % services.length][0],
          categorieID: family[3],
        },
      });
      const agentBeneficiary = await prisma.beneficiaire.upsert({
        where: { idp },
        create: { id: agentPerson.id, idp },
        update: {},
        select: { id: true, idp: true },
      });
      beneficiaries.push(agentBeneficiary);

      const spouse = spouseNames[index % spouseNames.length];
      const spouseIdp = `CJ-${String(matricule).padStart(8, '0')}`;
      const existingSpouse = await prisma.beneficiaire.findUnique({
        where: { idp: spouseIdp },
        include: { personne: true },
      });
      const spousePerson = existingSpouse?.personne ?? await prisma.personne.create({
        data: {
          nom: spouse[0],
          prenom: spouse[1],
          dateNaissance: dateUtc(`${1970 + (index % 13)}-${String(2 + (index % 8)).padStart(2, '0')}-12`),
          sexe: Sexe.FEMININ,
        },
      });
      await prisma.familleAgent.upsert({
        where: { id: spousePerson.id },
        create: {
          id: spousePerson.id,
          agentMatricule: matricule,
          carteSocialePath: `cartes-sociales/conjoint-${matricule}.jpg`,
        },
        update: {},
      });
      await prisma.conjoint.upsert({
        where: { id: spousePerson.id },
        create: { id: spousePerson.id },
        update: {},
      });
      const spouseBeneficiary = await prisma.beneficiaire.upsert({
        where: { idp: spouseIdp },
        create: { id: spousePerson.id, idp: spouseIdp },
        update: {},
        select: { id: true, idp: true },
      });
      beneficiaries.push(spouseBeneficiary);

      for (let childIndex = 0; childIndex < 2 + (index % 2); childIndex++) {
        const child = childNames[(index + childIndex) % childNames.length];
        const childIdp = `EN-${String(matricule).padStart(8, '0')}-${childIndex + 1}`;
        const existingChild = await prisma.beneficiaire.findUnique({
          where: { idp: childIdp },
          include: { personne: true },
        });
        const childPerson = existingChild?.personne ?? await prisma.personne.create({
          data: {
            nom: child[0],
            prenom: child[1],
            dateNaissance: dateUtc(`${2008 + ((index + childIndex) % 12)}-${String(3 + childIndex).padStart(2, '0')}-08`),
            sexe: (index + childIndex) % 2 === 0 ? Sexe.MASCULIN : Sexe.FEMININ,
          },
        });
        await prisma.familleAgent.upsert({
          where: { id: childPerson.id },
          create: {
            id: childPerson.id,
            agentMatricule: matricule,
            carteSocialePath: `cartes-sociales/enfant-${matricule}-${childIndex + 1}.jpg`,
          },
          update: {},
        });
        await prisma.enfant.upsert({
          where: { id: childPerson.id },
          create: { id: childPerson.id },
          update: {},
        });
        const childBeneficiary = await prisma.beneficiaire.upsert({
          where: { idp: childIdp },
          create: { id: childPerson.id, idp: childIdp },
          update: {},
          select: { id: true, idp: true },
        });
        beneficiaries.push(childBeneficiary);
      }
    }

    for (const [index, lineCount] of invoiceLineCounts.entries()) {
      const ref = `CEM-${2026 - (index % 3)}-${String(index + 1).padStart(4, '0')}`;
      const existing = await prisma.factureGlobale.findUnique({
        where: { refSociale: ref },
        select: { id: true },
      });
      if (existing) continue;

      const month = index % 12;
      const year = index < 12 ? 2026 : 2025;
      const dateReception = dateUtc(`${year}-${String(month + 1).padStart(2, '0')}-${String(3 + (index % 20)).padStart(2, '0')}`);
      const provider = providerRows[index % providerRows.length];
      const status = index === 14 ? StatutFacture.SORTIE : statusCycle[index % statusCycle.length];
      const facture = await prisma.factureGlobale.create({
        data: {
          refSociale: ref,
          annee: year,
          dateReception,
          numFacture: `FAC-${year}-${String(1001 + index).padStart(4, '0')}`,
          dateFacture: dateUtc(`${year}-${String(month + 1).padStart(2, '0')}-${String(1 + (index % 10)).padStart(2, '0')}`),
          moisPrestation: dateUtc(`${year}-${String(month + 1).padStart(2, '0')}-01`),
          refAgence: `AGC-${String(1 + (index % 8)).padStart(2, '0')}`,
          tauxCem: new Prisma.Decimal('80'),
          statut: status,
          prestataireId: provider.id,
          enregistreParId: operator.id,
          valideParId: status === StatutFacture.VALIDEE || status === StatutFacture.SORTIE
            ? (chief?.id ?? operator.id)
            : null,
          dateValidation: status === StatutFacture.VALIDEE || status === StatutFacture.SORTIE
            ? new Date(dateReception.getTime() + 5 * 86_400_000)
            : null,
        },
      });

      await prisma.mouvementFacture.create({
        data: {
          factureGlobaleId: facture.id,
          type: TypeMouvement.ENREGISTREMENT,
          date: dateReception,
          effectueParId: operator.id,
        },
      });

      let totalActes = 0;
      let totalCem = 0;
      let totalAgent = 0;
      let totalOverage = 0;
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        const beneficiary = beneficiaries[(index * 7 + lineIndex * 5) % beneficiaries.length];
        const act = acts[(index * 3 + lineIndex) % acts.length];
        const amount = [18000, 25000, 32000, 45000, 65000, 85000, 120000, 150000, 220000, 300000][
          (index + lineIndex) % 10
        ];
        const overage = lineIndex % 9 === 0 ? Math.round(amount * 0.12) : 0;
        const cemBase = Math.round(amount * 0.8);
        const agentPart = amount - cemBase;
        const dateAct = new Date(dateReception);
        dateAct.setDate(Math.min(28, 1 + (lineIndex % 27)));

        await prisma.factureIndividuelle.create({
          data: {
            factureGlobaleId: facture.id,
            numLigne: lineIndex + 1,
            libelle: act.nomActe,
            dateActe: dateAct,
            acteId: act.id,
            beneficiaireId: beneficiary.id,
            montantActe: new Prisma.Decimal(amount),
            montantCemIntegral: new Prisma.Decimal(cemBase),
            montantDepassementActe: new Prisma.Decimal(overage),
            montantDepassementPlafond: new Prisma.Decimal(0),
            tauxCem: new Prisma.Decimal('80'),
            observationDepassement: overage > 0 ? 'Dépassement lié au plafond applicable.' : null,
          },
        });
        await prisma.ligneSuivi.create({
          data: {
            factureGlobaleId: facture.id,
            beneficiaireId: beneficiary.id,
            acteId: act.id,
            dateActe: dateAct,
            libelle: act.nomActe,
            montantActe: new Prisma.Decimal(amount),
            saisiParId: operator.id,
          },
        });
        totalActes += amount;
        totalCem += cemBase;
        totalAgent += agentPart;
        totalOverage += overage;
      }

      await prisma.factureGlobale.update({
        where: { id: facture.id },
        data: {
          montantTotal: new Prisma.Decimal(totalActes),
          total100Cem: new Prisma.Decimal(totalCem),
          montant80Cem: new Prisma.Decimal(totalCem),
          montant20Agent: new Prisma.Decimal(totalAgent),
          totalChargeAgent: new Prisma.Decimal(totalAgent),
          totalDepassement: new Prisma.Decimal(totalOverage),
        },
      });
    }

    console.log('Jeu de données de soutenance créé.');
    console.log(`Prestataires : ${providerRows.length}`);
    console.log(`Agents, conjoints et enfants : ${beneficiaries.length} bénéficiaires.`);
    console.log(`Factures : ${invoiceLineCounts.length}`);
    console.log(`Lignes détaillées : ${invoiceLineCounts.reduce((sum, count) => sum + count, 0)}.`);
  } finally {
    await catalogue.end().catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Erreur inconnue.');
  process.exitCode = 1;
});
