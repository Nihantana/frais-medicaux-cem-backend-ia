-- CreateTable
CREATE TABLE "facturation"."discussion_facture" (
    "id" SERIAL NOT NULL,
    "facture_globale_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturation"."message_discussion_facture" (
    "id" SERIAL NOT NULL,
    "discussion_id" INTEGER NOT NULL,
    "auteur_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_discussion_facture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discussion_facture_facture_globale_id_key" ON "facturation"."discussion_facture"("facture_globale_id");
CREATE INDEX "message_discussion_facture_discussion_id_created_at_idx" ON "facturation"."message_discussion_facture"("discussion_id", "created_at");

-- AddForeignKey
ALTER TABLE "facturation"."discussion_facture" ADD CONSTRAINT "discussion_facture_facture_globale_id_fkey" FOREIGN KEY ("facture_globale_id") REFERENCES "facturation"."facture_globale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facturation"."message_discussion_facture" ADD CONSTRAINT "message_discussion_facture_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "facturation"."discussion_facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facturation"."message_discussion_facture" ADD CONSTRAINT "message_discussion_facture_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateur"."utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
