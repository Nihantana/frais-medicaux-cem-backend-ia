-- CreateEnum
CREATE TYPE "facturation"."statut_controle_visuel" AS ENUM ('a_verifier', 'en_cours', 'anomalie', 'conforme', 'erreur');

-- CreateEnum
CREATE TYPE "facturation"."statut_resultat_controle" AS ENUM ('conforme', 'anomalie', 'a_verifier', 'non_applicable');

-- CreateEnum
CREATE TYPE "facturation"."gravite_controle" AS ENUM ('information', 'mineure', 'majeure', 'bloquante');

-- CreateEnum
CREATE TYPE "pec"."statut_utilisation_attestation" AS ENUM ('disponible', 'jointe_a_facture', 'consommee', 'annulee');

-- AlterTable
ALTER TABLE "pec"."attestations"
ADD COLUMN "reference" TEXT,
ADD COLUMN "statut_utilisation" "pec"."statut_utilisation_attestation" NOT NULL DEFAULT 'disponible';

UPDATE "pec"."attestations"
SET "reference" = 'ATTESTATION-' || "id"
WHERE "reference" IS NULL;

ALTER TABLE "pec"."attestations"
ALTER COLUMN "reference" SET NOT NULL;

-- CreateTable
CREATE TABLE "facturation"."controle_visuel_facture" (
    "id" SERIAL NOT NULL,
    "facture_globale_id" INTEGER NOT NULL,
    "statut" "facturation"."statut_controle_visuel" NOT NULL DEFAULT 'a_verifier',
    "score" DECIMAL(5,2),
    "resultat_json" JSONB,
    "lance_par_id" INTEGER,
    "confirme_par_id" INTEGER,
    "confirme_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controle_visuel_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturation"."resultat_controle_facture" (
    "id" SERIAL NOT NULL,
    "controle_visuel_facture_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "statut" "facturation"."statut_resultat_controle" NOT NULL,
    "gravite" "facturation"."gravite_controle" NOT NULL,
    "valeur_attendue" TEXT,
    "valeur_trouvee" TEXT,
    "preuve" TEXT,
    "confiance" DECIMAL(5,2),
    "confirme" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultat_controle_facture_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "facturation"."piece_jointe_facture"
ADD COLUMN "attestation_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "attestations_reference_key" ON "pec"."attestations"("reference");
CREATE UNIQUE INDEX "controle_visuel_facture_facture_globale_id_key" ON "facturation"."controle_visuel_facture"("facture_globale_id");
CREATE INDEX "controle_visuel_facture_statut_idx" ON "facturation"."controle_visuel_facture"("statut");
CREATE UNIQUE INDEX "resultat_controle_facture_controle_visuel_facture_id_code_key" ON "facturation"."resultat_controle_facture"("controle_visuel_facture_id", "code");
CREATE INDEX "resultat_controle_facture_statut_idx" ON "facturation"."resultat_controle_facture"("statut");
CREATE UNIQUE INDEX "piece_jointe_facture_attestation_id_key" ON "facturation"."piece_jointe_facture"("attestation_id");

-- AddForeignKey
ALTER TABLE "facturation"."controle_visuel_facture"
ADD CONSTRAINT "controle_visuel_facture_facture_globale_id_fkey"
FOREIGN KEY ("facture_globale_id") REFERENCES "facturation"."facture_globale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "facturation"."controle_visuel_facture"
ADD CONSTRAINT "controle_visuel_facture_lance_par_id_fkey"
FOREIGN KEY ("lance_par_id") REFERENCES "utilisateur"."utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facturation"."controle_visuel_facture"
ADD CONSTRAINT "controle_visuel_facture_confirme_par_id_fkey"
FOREIGN KEY ("confirme_par_id") REFERENCES "utilisateur"."utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facturation"."resultat_controle_facture"
ADD CONSTRAINT "resultat_controle_facture_controle_visuel_facture_id_fkey"
FOREIGN KEY ("controle_visuel_facture_id") REFERENCES "facturation"."controle_visuel_facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "facturation"."piece_jointe_facture"
ADD CONSTRAINT "piece_jointe_facture_attestation_id_fkey"
FOREIGN KEY ("attestation_id") REFERENCES "pec"."attestations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
