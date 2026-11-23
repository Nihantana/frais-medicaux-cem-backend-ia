import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActionFacture } from './action-facture.js';

/** Rôles hérités du workflow actuel; ils restent à confirmer par le métier. */
export const ROLES_ACTION_FACTURE: Readonly<
  Record<ActionFacture, readonly string[]>
> = {
  [ActionFacture.RETOUR_PRESTATAIRE]: ['ASSISTANT'],
  [ActionFacture.ENVOI_VALIDATION]: ['ASSISTANT'],
  [ActionFacture.VALIDATION]: ['ADJOINT', 'CHEF_SERVICE'],
  [ActionFacture.RETOUR_CORRECTION]: [
    'ADJOINT',
    'CHEF_SERVICE',
  ],
  [ActionFacture.SORTIE]: ['ASSISTANT'],
  [ActionFacture.DEMANDE_SUPPRESSION]: [
    'ADJOINT',
    'CHEF_SERVICE',
  ],
  [ActionFacture.VALIDATION_SUPPRESSION]: [
    'ADJOINT',
    'CHEF_SERVICE',
  ],
  [ActionFacture.REFUS_SUPPRESSION]: [
    'ADJOINT',
    'CHEF_SERVICE',
  ],
  [ActionFacture.MODIFIER_INFORMATIONS]: ['ASSISTANT'],
  [ActionFacture.MODIFIER_MONTANTS]: ['ASSISTANT'],
  [ActionFacture.SUIVI_CREER]: ['ASSISTANT'],
  [ActionFacture.SUIVI_MODIFIER]: ['ASSISTANT'],
  [ActionFacture.SUIVI_SUPPRIMER]: ['ASSISTANT'],
};

@Injectable()
export class FacturePermissionsService {
  estActive(): boolean {
    return process.env.PERMISSIONS_ROLES_ACTIVES?.toLowerCase() === 'true';
  }

  verifier(
    action: ActionFacture,
    role: string,
    permissions?: readonly string[],
  ): void {
    if (permissions !== undefined) {
      if (permissions.includes(action)) return;
      throw new ForbiddenException(
        `La permission ${action} n'est pas accordée à cet utilisateur.`,
      );
    }
    if (!this.estActive()) return;
    if (ROLES_ACTION_FACTURE[action].includes(role)) return;
    throw new ForbiddenException(
      `Le rôle ${role} n'est pas autorisé à effectuer cette action.`,
    );
  }
}
