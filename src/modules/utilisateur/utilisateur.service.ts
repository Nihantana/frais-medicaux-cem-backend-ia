import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { RoleUtilisateur } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import {
  CreerUtilisateurDto,
  ModifierUtilisateurDto,
} from './dtos/utilisateur.dto.js';
import { CreerRoleDto, ModifierRoleDto } from './dtos/role.dto.js';

const UTILISATEUR_SELECT = {
  id: true,
  nom: true,
  email: true,
  rolesAssignees: {
    select: { role: { select: { code: true, libelle: true } } },
    orderBy: { role: { code: 'asc' } },
  },
} as const;
const PERMISSION_SELECT = {
  id: true,
  code: true,
  libelle: true,
} as const;

@Injectable()
export class UtilisateurService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(roles?: RoleUtilisateur[]) {
    const utilisateurs = await this.prisma.utilisateur.findMany({
      ...(roles === undefined ? {} : { where: { role: { in: roles } } }),
      select: UTILISATEUR_SELECT,
      orderBy: [{ role: 'asc' }, { nom: 'asc' }, { id: 'asc' }],
    });
    return utilisateurs.map((utilisateur) => this.presenter(utilisateur));
  }

  async obtenir(id: number) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: UTILISATEUR_SELECT,
    });
    if (utilisateur === null) {
      throw new NotFoundException(`L'utilisateur ${id} est introuvable.`);
    }
    return this.presenter(utilisateur);
  }

  async creer(donnees: CreerUtilisateurDto) {
    const roles = await this.resoudreRoles(
      donnees.roles ?? (donnees.role === undefined ? [] : [donnees.role]),
    );
    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        nom: donnees.nom,
        email: donnees.email,
        role: donnees.role ?? this.trouverRoleHistorique(roles),
        rolesAssignees: {
          create: roles.map((role) => ({ roleId: role.id })),
        },
      },
      select: UTILISATEUR_SELECT,
    });
    return this.presenter(utilisateur);
  }

  async modifier(id: number, donnees: ModifierUtilisateurDto) {
    if (
      donnees.nom === undefined &&
      donnees.email === undefined &&
      donnees.role === undefined &&
      donnees.roles === undefined
    ) {
      throw new BadRequestException(
        'Au moins un champ doit être fourni pour modifier l’utilisateur.',
      );
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const utilisateur = await transaction.utilisateur.findUnique({
          where: { id },
          select: { role: true },
        });
        if (utilisateur === null) {
          throw new NotFoundException(`L'utilisateur ${id} est introuvable.`);
        }
        const adminAvant =
          utilisateur.role === RoleUtilisateur.ADMINISTRATEUR ||
          (
            await transaction.utilisateurRole.count({
              where: {
                utilisateurId: id,
                role: { code: 'ADMINISTRATEUR' },
              },
            })
          ) > 0;
        if (donnees.role !== undefined && donnees.role !== utilisateur.role) {
          await transaction.utilisateurPermission.deleteMany({
            where: { utilisateurId: id },
          });
        }
        let roleHistorique = donnees.role;
        if (donnees.roles !== undefined) {
          const roles = await this.resoudreRoles(donnees.roles, transaction);
          await transaction.utilisateurRole.deleteMany({
            where: { utilisateurId: id },
          });
          await transaction.utilisateurRole.createMany({
            data: roles.map((role) => ({ utilisateurId: id, roleId: role.id })),
          });
          await transaction.utilisateurPermission.deleteMany({
            where: { utilisateurId: id },
          });
          roleHistorique = this.trouverRoleHistorique(roles);
        }
        const adminApres =
          donnees.role === undefined && donnees.roles === undefined
            ? adminAvant
            : roleHistorique === RoleUtilisateur.ADMINISTRATEUR ||
              (donnees.roles?.some(
                (role) => role.trim().toUpperCase() === 'ADMINISTRATEUR',
              ) ??
                false);
        if (adminAvant && !adminApres) {
          await this.verifierDernierAdministrateur(transaction);
        }
        const resultat = await transaction.utilisateur.update({
          where: { id },
          data: {
            ...(donnees.nom === undefined ? {} : { nom: donnees.nom }),
            ...(donnees.email === undefined ? {} : { email: donnees.email }),
            ...(roleHistorique === undefined ? {} : { role: roleHistorique }),
          },
          select: UTILISATEUR_SELECT,
        });
        return this.presenter(resultat);
      });
    } catch (erreur: unknown) {
      if (this.estErreurPrisma(erreur, 'P2025')) {
        throw new NotFoundException(`L'utilisateur ${id} est introuvable.`);
      }
      throw erreur;
    }
  }

  async supprimer(id: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const utilisateur = await transaction.utilisateur.findUnique({
          where: { id },
          select: { role: true },
        });
        if (utilisateur === null) {
          throw new NotFoundException(`L'utilisateur ${id} est introuvable.`);
        }
        const estAdministrateur =
          utilisateur.role === RoleUtilisateur.ADMINISTRATEUR ||
          (await transaction.utilisateurRole.count({
            where: {
              utilisateurId: id,
              role: { code: 'ADMINISTRATEUR' },
            },
          })) > 0;
        if (estAdministrateur) {
          await this.verifierDernierAdministrateur(transaction);
        }
        await transaction.utilisateur.delete({ where: { id } });
      });
    } catch (erreur: unknown) {
      if (this.estErreurPrisma(erreur, 'P2025')) {
        throw new NotFoundException(`L'utilisateur ${id} est introuvable.`);
      }

      if (this.estErreurPrisma(erreur, 'P2003')) {
        throw new ConflictException(
          'Cet utilisateur ne peut pas être supprimé car il est déjà utilisé par des factures ou des mouvements.',
        );
      }
      throw erreur;
    }
  }

  listerPermissions() {
    return this.prisma.permission.findMany({
      select: PERMISSION_SELECT,
      orderBy: { code: 'asc' },
    });
  }

  async obtenirPermissions(id: number) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: {
        role: true,
        rolesAssignees: { select: { roleId: true } },
        permissionsPersonnalisees: {
          select: { permissionId: true, autorisee: true },
        },
      },
    });
    if (utilisateur === null) {
      throw new NotFoundException(`L'utilisateur ${id} est introuvable.`);
    }

    const [permissions, rolesParDefaut, permissionsRolesConfigurables] =
      await Promise.all([
      this.prisma.permission.findMany({ select: PERMISSION_SELECT }),
      this.prisma.rolePermission.findMany({
        where: { role: utilisateur.role },
        select: { permissionId: true, autorisee: true },
      }),
      this.prisma.roleConfigPermission.findMany({
        where: {
          roleId: {
            in: utilisateur.rolesAssignees.map((role) => role.roleId),
          },
        },
        select: { permissionId: true, autorisee: true },
      }),
    ]);
    const exceptions = new Map(
      utilisateur.permissionsPersonnalisees.map((item) => [
        item.permissionId,
        item.autorisee,
      ]),
    );
    const defaults = new Map<number, boolean>();
    for (const item of rolesParDefaut) {
      defaults.set(
        item.permissionId,
        (defaults.get(item.permissionId) ?? false) || item.autorisee,
      );
    }
    for (const item of permissionsRolesConfigurables) {
      defaults.set(
        item.permissionId,
        (defaults.get(item.permissionId) ?? false) || item.autorisee,
      );
    }

    return permissions.map((permission) => ({
      ...permission,
      autorisee:
        exceptions.get(permission.id) ?? defaults.get(permission.id) ?? false,
      personnalisee: exceptions.has(permission.id),
    }));
  }

  listerRoles() {
    return this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, libelle: true, systeme: true },
    });
  }

  async creerRole(donnees: CreerRoleDto) {
    try {
      return await this.prisma.role.create({
        data: { code: donnees.code, libelle: donnees.libelle },
        select: { id: true, code: true, libelle: true, systeme: true },
      });
    } catch (erreur: unknown) {
      if (this.estErreurPrisma(erreur, 'P2002')) {
        throw new ConflictException(
          `Le rôle '${donnees.code}' existe déjà.`,
        );
      }
      throw erreur;
    }
  }

  async modifierRole(id: number, donnees: ModifierRoleDto) {
    if (donnees.libelle === undefined) {
      throw new BadRequestException('Le libellé doit être fourni.');
    }
    try {
      return await this.prisma.role.update({
        where: { id },
        data: { libelle: donnees.libelle },
        select: { id: true, code: true, libelle: true, systeme: true },
      });
    } catch (erreur: unknown) {
      if (this.estErreurPrisma(erreur, 'P2025')) {
        throw new NotFoundException(`Le rôle ${id} est introuvable.`);
      }
      throw erreur;
    }
  }

  async supprimerRole(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: { systeme: true },
    });
    if (role === null) {
      throw new NotFoundException(`Le rôle ${id} est introuvable.`);
    }
    if (role.systeme) {
      throw new ConflictException('Un rôle système ne peut pas être supprimé.');
    }
    await this.prisma.role.delete({ where: { id } });
  }

  obtenirPermissionsRole(id: number) {
    return this.prisma.permission.findMany({
      select: {
        ...PERMISSION_SELECT,
        rolesConfigurables: {
          where: { roleId: id },
          select: { autorisee: true },
        },
      },
      orderBy: { code: 'asc' },
    }).then((permissions) =>
      permissions.map(({ rolesConfigurables, ...permission }) => ({
        ...permission,
        autorisee: rolesConfigurables[0]?.autorisee ?? false,
        personnalisee: rolesConfigurables.length > 0,
      })),
    );
  }

  async modifierPermissionRole(
    roleId: number,
    code: string,
    autorisee: boolean,
  ) {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }),
      this.prisma.permission.findUnique({ where: { code }, select: { id: true } }),
    ]);
    if (role === null) throw new NotFoundException(`Le rôle ${roleId} est introuvable.`);
    if (permission === null) throw new NotFoundException(`La permission '${code}' est introuvable.`);
    return this.prisma.roleConfigPermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      create: { roleId, permissionId: permission.id, autorisee },
      update: { autorisee },
    });
  }

  async reinitialiserPermissionRole(roleId: number, code: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
      select: { id: true },
    });
    if (permission === null) {
      throw new NotFoundException(`La permission '${code}' est introuvable.`);
    }
    await this.prisma.roleConfigPermission.deleteMany({
      where: { roleId, permissionId: permission.id },
    });
  }

  private presenter(utilisateur: {
    id: number;
    nom: string;
    email: string | null;
    rolesAssignees: { role: { code: string; libelle: string } }[];
  }) {
    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      roles: utilisateur.rolesAssignees.map(({ role }) => role.code),
    };
  }

  private async resoudreRoles(
    codes: string[],
    prisma: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const normalises = [...new Set(codes.map((code) => code.trim().toUpperCase()))];
    if (normalises.length === 0) {
      throw new BadRequestException('Au moins un rôle doit être fourni.');
    }

    const roles = await prisma.role.findMany({
      where: { code: { in: normalises } },
      select: { id: true, code: true },
    });
    if (roles.length !== normalises.length) {
      const trouves = new Set(roles.map((role) => role.code));
      throw new BadRequestException(
        `Rôle(s) introuvable(s) : ${normalises.filter((code) => !trouves.has(code)).join(', ')}.`,
      );
    }
    return roles;
  }

  private async verifierDernierAdministrateur(
    prisma: Prisma.TransactionClient,
  ): Promise<void> {
    const nombreAdministrateurs = await prisma.utilisateur.count({
      where: {
        OR: [
          { role: RoleUtilisateur.ADMINISTRATEUR },
          {
            rolesAssignees: {
              some: { role: { code: 'ADMINISTRATEUR' } },
            },
          },
        ],
      },
    });
    if (nombreAdministrateurs <= 1) {
      throw new ConflictException(
        "Le dernier administrateur ne peut pas perdre ses droits ou être supprimé.",
      );
    }
  }

  private trouverRoleHistorique(
    roles: readonly { code: string }[],
  ): RoleUtilisateur {
    const correspondances: Record<string, RoleUtilisateur> = {
      ASSISTANT: RoleUtilisateur.OPERATEUR,
      CONTROLEUR: RoleUtilisateur.ADJOINT,
      ADJOINT: RoleUtilisateur.ADJOINT,
      CHEF_SERVICE: RoleUtilisateur.CHEF,
      DRH: RoleUtilisateur.CHEF,
      ADMINISTRATEUR: RoleUtilisateur.ADMINISTRATEUR,
    };
    const compatible = roles.find(
      (role) =>
        correspondances[role.code] !== undefined ||
        Object.values(RoleUtilisateur).includes(role.code as RoleUtilisateur),
    );
    return (
      (compatible === undefined
        ? undefined
        : correspondances[compatible.code] ??
          (compatible.code as RoleUtilisateur)) ??
      RoleUtilisateur.OPERATEUR
    );
  }

  async modifierPermission(
    utilisateurId: number,
    code: string,
    autorisee: boolean,
  ) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: { id: true },
    });
    if (utilisateur === null) {
      throw new NotFoundException(
        `L'utilisateur ${utilisateurId} est introuvable.`,
      );
    }

    const permission = await this.prisma.permission.findUnique({
      where: { code },
      select: { id: true },
    });
    if (permission === null) {
      throw new NotFoundException(`La permission '${code}' est introuvable.`);
    }

    return this.prisma.utilisateurPermission.upsert({
      where: {
        utilisateurId_permissionId: {
          utilisateurId,
          permissionId: permission.id,
        },
      },
      create: { utilisateurId, permissionId: permission.id, autorisee },
      update: { autorisee },
      select: {
        permission: { select: PERMISSION_SELECT },
        autorisee: true,
      },
    });
  }

  async reinitialiserPermission(utilisateurId: number, code: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
      select: { id: true },
    });
    if (permission === null) {
      throw new NotFoundException(`La permission '${code}' est introuvable.`);
    }
    await this.prisma.utilisateurPermission.deleteMany({
      where: { utilisateurId, permissionId: permission.id },
    });
  }

  private estErreurPrisma(erreur: unknown, code: string): boolean {
    return (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === code
    );
  }
}
