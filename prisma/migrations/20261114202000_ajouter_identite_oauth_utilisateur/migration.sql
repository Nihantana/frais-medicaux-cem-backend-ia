ALTER TABLE "utilisateur"."utilisateur"
ADD COLUMN "email" TEXT,
ADD COLUMN "oauth_subject" TEXT;

CREATE UNIQUE INDEX "utilisateur_email_key"
ON "utilisateur"."utilisateur"("email");

CREATE UNIQUE INDEX "utilisateur_oauth_subject_key"
ON "utilisateur"."utilisateur"("oauth_subject");
