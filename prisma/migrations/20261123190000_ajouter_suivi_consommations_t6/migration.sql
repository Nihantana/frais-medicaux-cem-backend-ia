CREATE TYPE "facturation"."TypeConsommationT6" AS ENUM ('MEDICAMENT', 'LUNETTES', 'AUTRE');
CREATE TYPE "facturation"."StatutMedicament" AS ENUM ('REFERENCE', 'A_VERIFIER');

CREATE TABLE "facturation"."medicament_reference" (
  "id" SERIAL NOT NULL,
  "cle_normalisee" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "source_id" TEXT,
  "nom" TEXT NOT NULL,
  "substance_active" TEXT,
  "statut" "facturation"."StatutMedicament" NOT NULL DEFAULT 'A_VERIFIER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medicament_reference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "facturation"."detail_consommation_t6" (
  "id" SERIAL NOT NULL,
  "ligne_t6_id" INTEGER NOT NULL,
  "type" "facturation"."TypeConsommationT6" NOT NULL,
  "quantite" DECIMAL(10,2),
  "medicament_id" INTEGER,
  "type_verre" TEXT,
  "monture" TEXT,
  "sphere_od" DECIMAL(6,2),
  "cylindre_od" DECIMAL(6,2),
  "axe_od" INTEGER,
  "sphere_og" DECIMAL(6,2),
  "cylindre_og" DECIMAL(6,2),
  "axe_og" INTEGER,
  "description" TEXT,
  CONSTRAINT "detail_consommation_t6_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "medicament_reference_cle_normalisee_key"
  ON "facturation"."medicament_reference"("cle_normalisee");
CREATE UNIQUE INDEX "medicament_reference_source_source_id_key"
  ON "facturation"."medicament_reference"("source", "source_id");
CREATE INDEX "medicament_reference_nom_idx"
  ON "facturation"."medicament_reference"("nom");
CREATE INDEX "medicament_reference_statut_idx"
  ON "facturation"."medicament_reference"("statut");
CREATE UNIQUE INDEX "detail_consommation_t6_ligne_t6_id_key"
  ON "facturation"."detail_consommation_t6"("ligne_t6_id");
CREATE INDEX "detail_consommation_t6_type_idx"
  ON "facturation"."detail_consommation_t6"("type");
CREATE INDEX "detail_consommation_t6_medicament_id_idx"
  ON "facturation"."detail_consommation_t6"("medicament_id");

ALTER TABLE "facturation"."detail_consommation_t6"
  ADD CONSTRAINT "detail_consommation_t6_ligne_t6_id_fkey"
  FOREIGN KEY ("ligne_t6_id") REFERENCES "facturation"."facture_individuelle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facturation"."detail_consommation_t6"
  ADD CONSTRAINT "detail_consommation_t6_medicament_id_fkey"
  FOREIGN KEY ("medicament_id") REFERENCES "facturation"."medicament_reference"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
