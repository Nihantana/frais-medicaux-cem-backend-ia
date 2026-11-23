# Backend — Frais médicaux CEM

API de gestion des frais médicaux de la Caisse d'Épargne de Madagascar. Elle
fournit les référentiels, règles de prise en charge, factures, suivis T5/T6,
contrôle visuel et états de paie. Le frontend associé est dans
`../FRM_FRONTEND_IA`.

### Technologies

- NestJS
- Prisma
- PostgreSQL

### Structure du projet

```text
FRM_BACKEND_IA/
├── prisma/                 # schéma, modèles par domaine et migrations
├── private-data/           # données SQL de référence non publiques
├── scripts/                # seeds de démonstration
├── src/
│   ├── common/             # configuration et comportements transverses
│   ├── infrastructure/     # Prisma et stockage de fichiers
│   └── modules/            # authentification et domaines métier
└── test/                   # tests unitaires, d'intégration et e2e
```

### Démarrage local

Prérequis : Node.js, PostgreSQL, et Keycloak pour les routes authentifiées.
Depuis ce dossier, préparer la configuration locale puis démarrer l'API :

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Adapter `.env` à l'instance PostgreSQL et Keycloak utilisée. L'API écoute sur
le port `3000` par défaut (variable `PORT`) et publie Swagger sur `/docs`,
ainsi que le document OpenAPI sur `/docs-json`. Tesseract est utilisé pour
l'OCR; Ollama est utilisé par le contrôle visuel, le rapprochement sémantique
et l'assistant global.

Scripts de vérification :

```powershell
npm run build
npm test
npm run test:e2e
npm run lint
```

### Permissions par rôle

Le catalogue des permissions et les profils du cahier des charges sont
initialisés après le déploiement du schéma avec `npm run seed:access-control`.
Les droits par défaut sont définis par profil dans le code; seules les
modifications faites par un administrateur sont enregistrées en base. Le seed
est idempotent et conserve ces personnalisations. Il doit être exécuté sur la
base cible avant d’activer l’application avec les nouveaux contrôles d’accès.

Les droits des utilisateurs authentifiés sont exposés par
`GET /auth/me/permissions`. Les API et l’interface utilisent les mêmes codes
de permission. Les fonctions hors périmètre du cahier des charges ne sont pas
accordées par défaut aux rôles métier; l’administrateur peut les attribuer
depuis la gestion des rôles et des utilisateurs.

### Import des directions, services et agences

La commande suivante importe le classeur Excel de manière idempotente :

```powershell
npm run seed:organizational-structures -- "D:/chemin/Sheet AGENCE & SERVICE.xlsx"
```

Sans argument, le script recherche le fichier
`D:/AVOTRASINA/DATA FRM/Sheet AGENCE & SERVICE.xlsx`. Il lit l’onglet
`Direction Service`, met à jour les libellés existants et ignore les lignes
de direction sans code de service. Les codes des agences, directions et services
constituent les clés d’identification.

Le seed nettoie aussi les anciens codes dynamiques obsolètes `OPERATEUR` et
`CHEF` présents dans la table des rôles: les affectations sont déplacées vers
`ASSISTANT` et `CHEF_SERVICE`, et leurs dérogations de permissions sont
conservées. Les valeurs historiques `OPERATEUR`, `ADJOINT`, `CHEF` et
`ADMINISTRATEUR` restent nécessaires dans l’enum technique pour la compatibilité
des anciennes factures et workflows.

### Conventions du code et de l'API

- La logique métier est regroupée par domaine sous `src/modules/<module>`.
- Les dossiers `repositories/`, `use-cases/`, `dtos/` et `types/` organisent
  les accès aux données, cas d'usage, contrats HTTP et types de module.
- Les noms de dossiers et chemins HTTP utilisent le kebab-case; les noms de
  méthodes utilisent le camelCase.
- Les contrats partagés d'un module restent dans ses types. Les formes propres
  aux requêtes Prisma restent locales au dépôt qui les utilise.
- Les contrôleurs décrivent les réponses dans Swagger; les routes de fichiers
  documentent leur réponse binaire au lieu d'un DTO JSON.
- L'interface Swagger est disponible sur `/docs`, et le document OpenAPI sur
  `/docs-json`. Le frontend génère ses types avec `npm run api:types` dans
  `FRM_FRONTEND_IA`.
- Pour les demandes de suppression, consulter les routes de chaque contrôleur;
  les opérations usuelles sont `DELETE /<collection>/:id` puis les actions de
  validation ou de rejet.

Les routes ont été renommées sans alias de compatibilité. Les principaux
préfixes sont :

| Resource                  | Prefix                       |
| ------------------------- | ---------------------------- |
| Agents                   | `/agents`                    |
| Catégories d'agents      | `/agent-categories`          |
| Familles d'agents        | `/agent-families`            |
| Attestations             | `/attestations`              |
| Bénéficiaires            | `/beneficiaries`             |
| Actes                    | `/actes`                     |
| Catégories d'actes       | `/categories-actes`          |
| Plafonds                 | `/plafonds`                  |
| Prestataires             | `/providers`                 |
| Catégories de prestataire| `/provider-categories`       |
| Lieux                    | `/locations`                 |
| Structures organisationnelles | `/organizational-structures` |
| Factures                 | `/factures`                  |
| États de paie            | `/paies`                     |
| Assistant global         | `/assistant`                 |
| Audit et sessions        | `/audit`                     |
| Utilisateurs             | `/utilisateurs`              |

Les anciens préfixes et chemins d'action ne sont plus exposés. Les clients API
doivent utiliser les préfixes et les chemins normalisés ci-dessus.

### Audit et sessions

Les routes `/audit/actions`, `/audit/actions/stream` (SSE) et
`/audit/sessions` sont réservées aux administrateurs. Les mutations authentifiées
(`POST`, `PUT`, `PATCH`, `DELETE`) sont journalisées sans corps ni paramètres
de requête. Le flux temps réel diffuse les actions finalisées; la page se
reconnecte et recharge les données en cas d'interruption. Les événements SSE
sont locaux au processus backend : plusieurs instances exigent un mécanisme de
diffusion partagé.

La consultation des sessions utilise le compte de service Keycloak défini par
`KEYCLOAK_ADMIN_CLIENT_ID` et `KEYCLOAK_ADMIN_CLIENT_SECRET`. Dans le realm,
associer au client le scope client `kc-admin-api` et les rôles
`realm-management` nécessaires (`query-clients`, `view-clients`, `view-users`).

### Données de démonstration et référentiels

Le dépôt ne configure pas de commande `prisma db seed`. Les seeds disponibles
sont `npm run seed:facturation-demo`, `npm run seed:demo-suivi`,
`npm run seed:jeu-test-ia` et `npm run seed:soutenance`; ils sont réservés aux
environnements hors production et exigent `ALLOW_DEMO_SEED=true`. Leur usage
détaillé figure dans [`README-FACTURATION.md`](./README-FACTURATION.md).

Le jeu IA S01-S19 est décrit dans
[`JEU-TEST-IA.md`](./JEU-TEST-IA.md). Il peut être supprimé puis recréé sans
affecter les données hors du préfixe `DEMO-IA-`.

Le fichier `private-data/actes-et-plafonds.sql` contient des données de
référence. Il ne fait pas partie des migrations et ne doit être appliqué
qu'après vérification de son contenu et de la base cible.

Actes, catégories d'actes et plafonds sont gérés respectivement par
`/actes`, `/categories-actes` et `/plafonds`, avec les opérations CRUD.
Un plafond doit être rattaché à un seul acte ou à une seule catégorie. Son
unité `MONTANT` exige `montant` et exclut `nbSeances`; son unité `SEANCES`
exige `nbSeances` et exclut `montant`.
La création d'un acte peut aussi inclure ses plafonds dans `POST /actes`;
`POST /categories-actes` accepte de la même façon les plafonds partagés de la
catégorie. Les routes CRUD historiques, notamment `/plafonds`, restent
disponibles.

### Organisation du module Facturation

`src/modules/facturation/facturation.module.ts` compose les modules
fonctionnels des factures, du suivi, des pièces jointes, du contrôle visuel,
des notifications et des discussions.
`FacturationCoreModule` regroupe les services métier
partagés et leurs dépendances Nest (`PrismaModule`, `PlafondModule`,
`ReglesPriseEnChargeModule` et `StorageModule`). Les noms de fichiers suivent
le kebab-case et les classes de modules le suffixe `Module`.
La gestion transversale des comptes et la route `/utilisateurs` appartiennent
au `UtilisateurModule`, indépendant de Facturation et importé par
`AppModule`.

### Workflow Facturation

Les actions de workflow passent par `PATCH /factures/:id/statut`, avec un
`type` et les champs propres à l’action. `GET /factures/:id/transitions` expose
les actions disponibles et leurs champs requis. `GET /factures/:id/mouvements`
renvoie l’historique (filtrable par `type`) dans l’ordre de création; la date
du mouvement est métier et `createdAt` est son horodatage technique.
Les anciennes routes d’action `POST` et `GET /factures/:id/historique` ne sont
pas exposées; utiliser `PATCH /factures/:id/statut` et
`GET /factures/:id/mouvements`. `GET /utilisateurs?role=ADJOINT,CHEF` fournit
les valideurs disponibles. Les dates d’action sont limitées à la date
d’enregistrement de la facture et à aujourd’hui.

Les listes excluent `SUPPRIMEE` par défaut; `?statut=SUPPRIMEE` permet de
l’inclure. Les rôles sont désactivés par défaut; `PERMISSIONS_ROLES_ACTIVES=true`
active la table de permissions à confirmer.

### Suivi T5_x

Le suivi des consommations est indépendant de `FactureGlobale` :
`POST /factures/:id/suivis`, `GET /suivis`,
`PATCH /suivis/lignes/:ligneId` et `DELETE /suivis/lignes/:ligneId` gèrent les
saisies et recalculent la feuille à l’affichage. Les lignes d’une facture
`SUPPRIMEE` sont exclues des feuilles; une ligne déjà présente dans le T6 est
verrouillée. Les montants calculés sont renvoyés comme chaînes à deux
décimales. `GET /suivis` renvoie un `modele` (`PLAFOND_ANNUEL`, `SEANCES` ou
`PLAFOND_ACTE_ET_ANNUEL`) et les `colonnes` correspondantes. L’entête regroupe
les informations du bénéficiaire, de son agent, de sa direction et de son
service/agence. Chaque ligne expose toutes les clés de calcul, les clés
inapplicables étant `null`; les plafonds comprennent leur date d’effet et
l’indicateur de changement annuel. Les totaux utilisent `montantActe` et
`totalDepassement`.

### Lignes de facture et retenue sur salaire (T6)

Les lignes d’une facture globale sont adressées par son identifiant :
`POST /factures/:id/lignes`, `PUT /factures/:id/lignes/:ligneId`,
`DELETE /factures/:id/lignes/:ligneId` et `GET /factures/:id/lignes`.
Les montants calculés sont renvoyés comme chaînes à deux décimales. Les lignes
sont modifiables uniquement en `ENREGISTREE` ou `A_CORRIGER`; leur suppression
est physique. `GET /factures/:id/lignes/proposition?idp=&acteId=&dateActe=`
lit les dépassements T5_x sans les recopier automatiquement.
`numPec` est l’identifiant entier d’une `Attestation`; une attestation
introuvable ou déjà affectée à une autre ligne produit un avertissement.

`PATCH /factures/:id/retenue` ne saisit que la référence libre `refPaie` sur
les lignes sélectionnées. `moisAffectation` reste vide à la création et est
renseigné uniquement lors de la clôture mensuelle. Une facture clôturée refuse
les modifications; l'ajout d'une pièce jointe reste permis.
`GET /factures/:id/controle-totaux` compare les sommes des lignes aux montants
de la facture. L’envoi en validation et la validation exigent des totaux
concordants. Tout écart ou toute facture sans ligne bloque l’envoi en validation
et la validation.

### Clôture et états de paie

`POST /factures/:id/cloture` clôture une facture par requête. Le corps contient
`moisAffectation` (`AAAA-MM`) et `dateCloture` (`AAAA-MM-JJ`). La clôture
affecte le mois à la facture et à ses lignes T6, puis ajoute un mouvement
`CLOTURE`. Une facture déjà clôturée ne peut pas être réouverte par l'API.

Les routes `GET /paies`, `GET /paies/:mois/lignes`,
`GET /paies/:mois/consommation`, `GET /paies/:mois/etat` et
`GET /paies/:mois/agents/:im` sont en lecture seule. Elles utilisent les lignes
T6 affectées au premier jour du mois demandé, donc excluent les factures non
clôturées. Les montants sont renvoyés sous forme de chaînes décimales à deux
chiffres; les lignes sont paginées par défaut à 50, avec une limite maximale
de 200.

### Pièces jointes des factures

`POST /factures/:id/pieces-jointes` accepte un fichier multipart nommé
`fichier` (PDF, JPEG ou PNG, 10 Mo maximum). Le contenu est validé par sa
signature, indépendamment de son nom et du MIME déclaré. Une facture peut
contenir au plus 20 pièces jointes; l’ajout est permis dans tout statut sauf
`SUPPRIMEE`. Les fichiers sont stockés sous un nom UUID dans la catégorie
`factures` et leur nom d’origine est conservé après nettoyage.

`GET /factures/:id/pieces-jointes` liste les pièces; la route avec `:pieceId`
sert le fichier en ligne uniquement s’il appartient à la facture demandée.
`DELETE /factures/:id/pieces-jointes/:pieceId` est permis en `ENREGISTREE`,
`A_CORRIGER` ou `RETOURNEE`. Le détail `GET /factures/:id` expose aussi
`nombrePiecesJointes`.
