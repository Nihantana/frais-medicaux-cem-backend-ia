import type { RoleUtilisateur } from '../../generated/prisma/enums.js';

export interface UtilisateurAuthentifie {
  id: number;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  roles: string[];
  hasPhoto: boolean;
}

export interface RequeteAuthentifiee {
  user?: UtilisateurAuthentifie;
}
