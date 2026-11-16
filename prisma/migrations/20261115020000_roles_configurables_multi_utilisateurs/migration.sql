CREATE TABLE "utilisateur"."role" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "systeme" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "utilisateur"."utilisateur_role" (
    "utilisateur_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    CONSTRAINT "utilisateur_role_pkey" PRIMARY KEY ("utilisateur_id", "role_id")
);

CREATE TABLE "utilisateur"."role_config_permission" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "autorisee" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "role_config_permission_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE UNIQUE INDEX "role_code_key" ON "utilisateur"."role"("code");

ALTER TABLE "utilisateur"."utilisateur_role"
ADD CONSTRAINT "utilisateur_role_utilisateur_id_fkey"
FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"."utilisateur"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utilisateur"."utilisateur_role"
ADD CONSTRAINT "utilisateur_role_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "utilisateur"."role"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utilisateur"."role_config_permission"
ADD CONSTRAINT "role_config_permission_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "utilisateur"."role"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utilisateur"."role_config_permission"
ADD CONSTRAINT "role_config_permission_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "utilisateur"."permission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "utilisateur"."role" ("code", "libelle", "systeme") VALUES
('ASSISTANT', 'Assistant', false),
('CONTROLEUR', 'Contrôleur', false),
('ADJOINT', 'Adjoint', false),
('CHEF_SERVICE', 'Chef de service', false),
('DRH', 'Direction des ressources humaines', false),
('ADMINISTRATEUR', 'Administrateur', true),
('OPERATEUR', 'Opérateur (legacy)', true),
('CHEF', 'Chef (legacy)', true);

INSERT INTO "utilisateur"."utilisateur_role" ("utilisateur_id", "role_id")
SELECT u."id", r."id"
FROM "utilisateur"."utilisateur" u
JOIN "utilisateur"."role" r ON r."code" = UPPER(u."role"::text);

INSERT INTO "utilisateur"."role_config_permission" ("role_id", "permission_id", "autorisee")
SELECT r."id", rp."permission_id", rp."autorisee"
FROM "utilisateur"."role_permission" rp
JOIN "utilisateur"."role" r ON r."code" = UPPER(rp."role"::text);
