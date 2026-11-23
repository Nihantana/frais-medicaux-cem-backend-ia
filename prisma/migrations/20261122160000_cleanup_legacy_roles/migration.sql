INSERT INTO utilisateur.role (code, libelle, systeme)
VALUES
  ('ASSISTANT', 'Assistant', true),
  ('CONTROLEUR', 'Attaché (contrôleur)', true),
  ('ADJOINT', 'Gestionnaire frais médicaux (Adjoint)', true),
  ('CHEF_SERVICE', 'Chef du service', true),
  ('DRH', 'DRH / Responsable', true),
  ('ADMINISTRATEUR', 'Administrateur', true)
ON CONFLICT (code) DO UPDATE
SET libelle = EXCLUDED.libelle,
    systeme = true;

INSERT INTO utilisateur.utilisateur_role (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateur.utilisateur u
JOIN utilisateur.role r ON r.code = CASE u.role::text
  WHEN 'operateur' THEN 'ASSISTANT'
  WHEN 'adjoint' THEN 'ADJOINT'
  WHEN 'chef' THEN 'CHEF_SERVICE'
  WHEN 'administrateur' THEN 'ADMINISTRATEUR'
END
ON CONFLICT (utilisateur_id, role_id) DO NOTHING;

DROP TABLE IF EXISTS utilisateur.role_permission;

ALTER TABLE utilisateur.utilisateur DROP COLUMN IF EXISTS role;

DROP TYPE IF EXISTS utilisateur.role_utilisateur;
