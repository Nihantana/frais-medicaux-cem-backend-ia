INSERT INTO "utilisateur"."role_config_permission" ("role_id", "permission_id", "autorisee")
SELECT role_cible."id", permission_role."permission_id", permission_role."autorisee"
FROM (
    VALUES
      ('ASSISTANT', 'operateur'::"utilisateur"."role_utilisateur"),
      ('CONTROLEUR', 'adjoint'::"utilisateur"."role_utilisateur"),
      ('ADJOINT', 'adjoint'::"utilisateur"."role_utilisateur"),
      ('CHEF_SERVICE', 'chef'::"utilisateur"."role_utilisateur"),
      ('DRH', 'chef'::"utilisateur"."role_utilisateur"),
      ('ADMINISTRATEUR', 'administrateur'::"utilisateur"."role_utilisateur")
) AS correspondance("code", "role_legacy")
JOIN "utilisateur"."role" role_cible
  ON role_cible."code" = correspondance."code"
JOIN "utilisateur"."role_permission" permission_role
  ON permission_role."role" = correspondance."role_legacy"
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
