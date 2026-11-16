CREATE TABLE "utilisateur"."permission" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "utilisateur"."role_permission" (
    "role" "utilisateur"."role_utilisateur" NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "autorisee" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role", "permission_id")
);

CREATE TABLE "utilisateur"."utilisateur_permission" (
    "utilisateur_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "autorisee" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "utilisateur_permission_pkey" PRIMARY KEY ("utilisateur_id", "permission_id")
);

CREATE UNIQUE INDEX "permission_code_key" ON "utilisateur"."permission"("code");

ALTER TABLE "utilisateur"."role_permission"
ADD CONSTRAINT "role_permission_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "utilisateur"."permission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utilisateur"."utilisateur_permission"
ADD CONSTRAINT "utilisateur_permission_utilisateur_id_fkey"
FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"."utilisateur"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utilisateur"."utilisateur_permission"
ADD CONSTRAINT "utilisateur_permission_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "utilisateur"."permission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "utilisateur"."permission" ("code", "libelle") VALUES
('retour-prestataire', 'Retourner une facture au prestataire'),
('envoi-validation', 'Envoyer une facture en validation'),
('validation', 'Valider une facture'),
('retour-correction', 'Retourner une facture pour correction'),
('sortie', 'Enregistrer la sortie d’une facture'),
('demande-suppression', 'Demander la suppression d’une facture'),
('validation-suppression', 'Valider la suppression d’une facture'),
('refus-suppression', 'Refuser la suppression d’une facture'),
('modifier-informations', 'Modifier les informations d’une facture'),
('modifier-montants', 'Modifier les montants d’une facture'),
('suivi-creer', 'Créer une ligne de suivi'),
('suivi-modifier', 'Modifier une ligne de suivi'),
('suivi-supprimer', 'Supprimer une ligne de suivi');

INSERT INTO "utilisateur"."role_permission" ("role", "permission_id")
SELECT 'operateur', "id" FROM "utilisateur"."permission"
WHERE "code" IN (
  'retour-prestataire', 'envoi-validation', 'sortie',
  'modifier-informations', 'modifier-montants',
  'suivi-creer', 'suivi-modifier', 'suivi-supprimer'
);

INSERT INTO "utilisateur"."role_permission" ("role", "permission_id")
SELECT 'adjoint', "id" FROM "utilisateur"."permission"
WHERE "code" IN (
  'validation', 'retour-correction', 'demande-suppression',
  'validation-suppression', 'refus-suppression'
);

INSERT INTO "utilisateur"."role_permission" ("role", "permission_id")
SELECT 'chef', "id" FROM "utilisateur"."permission"
WHERE "code" IN (
  'validation', 'retour-correction', 'demande-suppression',
  'validation-suppression', 'refus-suppression'
);

INSERT INTO "utilisateur"."role_permission" ("role", "permission_id")
SELECT 'administrateur', "id" FROM "utilisateur"."permission";

