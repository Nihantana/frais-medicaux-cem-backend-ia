-- CreateEnum
CREATE TYPE "facturation"."portee_notification" AS ENUM ('individuelle', 'globale');

-- CreateEnum
CREATE TYPE "facturation"."type_notification" AS ENUM ('ENVOI_VALIDATION', 'RETOUR_POUR_CORRECTION', 'RETOUR_PRESTATAIRE', 'RECEPTION_APRES_MODIFICATION', 'VALIDATION', 'SORTIE', 'DEMANDE_SUPPRESSION');

-- CreateTable
CREATE TABLE "facturation"."notification" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "facture_globale_id" INTEGER NOT NULL,
    "mouvement_id" INTEGER NOT NULL,
    "portee" "facturation"."portee_notification" NOT NULL,
    "type" "facturation"."type_notification" NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_utilisateur_id_lu_le_created_at_idx" ON "facturation"."notification"("utilisateur_id", "lu_le", "created_at");

-- CreateIndex
CREATE INDEX "notification_facture_globale_id_idx" ON "facturation"."notification"("facture_globale_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_mouvement_id_utilisateur_id_key" ON "facturation"."notification"("mouvement_id", "utilisateur_id");

-- AddForeignKey
ALTER TABLE "facturation"."notification" ADD CONSTRAINT "notification_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"."utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturation"."notification" ADD CONSTRAINT "notification_facture_globale_id_fkey" FOREIGN KEY ("facture_globale_id") REFERENCES "facturation"."facture_globale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturation"."notification" ADD CONSTRAINT "notification_mouvement_id_fkey" FOREIGN KEY ("mouvement_id") REFERENCES "facturation"."mouvement_facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
