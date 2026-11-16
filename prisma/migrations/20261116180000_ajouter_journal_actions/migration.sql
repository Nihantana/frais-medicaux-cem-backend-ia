CREATE TABLE "utilisateur"."journal_action" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "utilisateur_nom" TEXT NOT NULL,
    "utilisateur_email" TEXT,
    "methode" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "cible_id" TEXT,
    "statut_http" INTEGER,
    "resultat" TEXT NOT NULL DEFAULT 'EN_COURS',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termine_le" TIMESTAMP(3),

    CONSTRAINT "journal_action_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "journal_action_cree_le_idx"
ON "utilisateur"."journal_action"("cree_le" DESC);

CREATE INDEX "journal_action_utilisateur_id_cree_le_idx"
ON "utilisateur"."journal_action"("utilisateur_id", "cree_le" DESC);
