export interface UtilisateurAuthentifie {
  id: number;
  nom: string;
  email: string;
  roles: string[];
  hasPhoto: boolean;
}

export interface RequeteAuthentifiee {
  user?: UtilisateurAuthentifie;
}
