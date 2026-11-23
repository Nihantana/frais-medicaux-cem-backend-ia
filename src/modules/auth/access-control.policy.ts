export const ACCESS_PERMISSIONS = {
  agentsRead: 'agents.read',
  agentsWrite: 'agents.write',
  beneficiariesRead: 'beneficiaries.read',
  beneficiariesWrite: 'beneficiaries.write',
  providersRead: 'providers.read',
  providersWrite: 'providers.write',
  attestationsRead: 'attestations.read',
  attestationsWrite: 'attestations.write',
  attestationsValidate: 'attestations.validate',
  invoicesRead: 'invoices.read',
  invoicesWrite: 'invoices.write',
  invoicesValidate: 'invoices.validate',
  followUpRead: 'follow-up.read',
  followUpWrite: 'follow-up.write',
  t6Read: 't6.read',
  t6Write: 't6.write',
  reportingRead: 'reporting.read',
  payrollRead: 'payroll.read',
  payrollClose: 'payroll.close',
  referenceDataRead: 'reference-data.read',
  referentialsManage: 'referentials.manage',
  assistantUse: 'assistant.use',
  verificationUse: 'verification.use',
  auditRead: 'audit.read',
  deletionsManage: 'deletions.manage',
  discussionUse: 'discussion.use',
  notificationsRead: 'notifications.read',
  adminManage: 'admin.manage',
  invoiceSendForValidation: 'envoi-validation',
  invoiceReturnToProvider: 'retour-prestataire',
  invoiceValidate: 'validation',
  invoiceReturnForCorrection: 'retour-correction',
  invoiceExit: 'sortie',
  invoiceEditInformation: 'modifier-informations',
  invoiceEditAmounts: 'modifier-montants',
  followUpCreate: 'suivi-creer',
  followUpEdit: 'suivi-modifier',
  followUpDelete: 'suivi-supprimer',
} as const;

export type AccessPermissionCode =
  (typeof ACCESS_PERMISSIONS)[keyof typeof ACCESS_PERMISSIONS];

export const ACCESS_PERMISSION_DEFINITIONS: readonly {
  code: AccessPermissionCode;
  libelle: string;
}[] = [
  { code: ACCESS_PERMISSIONS.agentsRead, libelle: 'Consulter les agents' },
  { code: ACCESS_PERMISSIONS.agentsWrite, libelle: 'Saisir les agents' },
  {
    code: ACCESS_PERMISSIONS.beneficiariesRead,
    libelle: 'Consulter les bénéficiaires',
  },
  {
    code: ACCESS_PERMISSIONS.beneficiariesWrite,
    libelle: 'Saisir les bénéficiaires',
  },
  {
    code: ACCESS_PERMISSIONS.providersRead,
    libelle: 'Consulter les prestataires',
  },
  {
    code: ACCESS_PERMISSIONS.providersWrite,
    libelle: 'Saisir les prestataires',
  },
  {
    code: ACCESS_PERMISSIONS.attestationsRead,
    libelle: 'Consulter les prises en charge',
  },
  {
    code: ACCESS_PERMISSIONS.attestationsWrite,
    libelle: 'Saisir les prises en charge',
  },
  {
    code: ACCESS_PERMISSIONS.attestationsValidate,
    libelle: 'Valider les prises en charge',
  },
  { code: ACCESS_PERMISSIONS.invoicesRead, libelle: 'Consulter le T5' },
  { code: ACCESS_PERMISSIONS.invoicesWrite, libelle: 'Saisir le T5' },
  { code: ACCESS_PERMISSIONS.invoicesValidate, libelle: 'Valider le T5' },
  { code: ACCESS_PERMISSIONS.followUpRead, libelle: 'Consulter le T5_x' },
  { code: ACCESS_PERMISSIONS.followUpWrite, libelle: 'Saisir le T5_x' },
  { code: ACCESS_PERMISSIONS.t6Read, libelle: 'Consulter le T6' },
  { code: ACCESS_PERMISSIONS.t6Write, libelle: 'Saisir le T6' },
  {
    code: ACCESS_PERMISSIONS.reportingRead,
    libelle: 'Consulter les tableaux de bord et statistiques',
  },
  {
    code: ACCESS_PERMISSIONS.payrollRead,
    libelle: 'Consulter les états de paie',
  },
  {
    code: ACCESS_PERMISSIONS.payrollClose,
    libelle: 'Clôturer la paie',
  },
  {
    code: ACCESS_PERMISSIONS.referenceDataRead,
    libelle: 'Consulter les données de référence nécessaires aux dossiers',
  },
  {
    code: ACCESS_PERMISSIONS.referentialsManage,
    libelle: 'Gérer les référentiels et paramètres métier',
  },
  { code: ACCESS_PERMISSIONS.assistantUse, libelle: 'Utiliser l’assistant IA' },
  {
    code: ACCESS_PERMISSIONS.verificationUse,
    libelle: 'Contrôler les factures par IA',
  },
  { code: ACCESS_PERMISSIONS.auditRead, libelle: 'Consulter le journal d’audit' },
  {
    code: ACCESS_PERMISSIONS.deletionsManage,
    libelle: 'Gérer les demandes de suppression',
  },
  {
    code: ACCESS_PERMISSIONS.discussionUse,
    libelle: 'Participer aux discussions sur les factures',
  },
  {
    code: ACCESS_PERMISSIONS.notificationsRead,
    libelle: 'Consulter les notifications',
  },
  { code: ACCESS_PERMISSIONS.adminManage, libelle: 'Gérer les droits système' },
  {
    code: ACCESS_PERMISSIONS.invoiceSendForValidation,
    libelle: 'Envoyer une facture en validation',
  },
  {
    code: ACCESS_PERMISSIONS.invoiceReturnToProvider,
    libelle: 'Retourner une facture au prestataire',
  },
  {
    code: ACCESS_PERMISSIONS.invoiceValidate,
    libelle: 'Valider une facture',
  },
  {
    code: ACCESS_PERMISSIONS.invoiceReturnForCorrection,
    libelle: 'Retourner une facture pour correction',
  },
  {
    code: ACCESS_PERMISSIONS.invoiceExit,
    libelle: 'Enregistrer la sortie d’une facture',
  },
  {
    code: ACCESS_PERMISSIONS.invoiceEditInformation,
    libelle: 'Modifier les informations d’une facture',
  },
  {
    code: ACCESS_PERMISSIONS.invoiceEditAmounts,
    libelle: 'Modifier les montants d’une facture',
  },
  { code: ACCESS_PERMISSIONS.followUpCreate, libelle: 'Créer une ligne T5_x' },
  { code: ACCESS_PERMISSIONS.followUpEdit, libelle: 'Modifier une ligne T5_x' },
  { code: ACCESS_PERMISSIONS.followUpDelete, libelle: 'Supprimer une ligne T5_x' },
];

const REFERENCE_READ = ACCESS_PERMISSIONS.referenceDataRead;
const T1_T3_READ = [
  ACCESS_PERMISSIONS.agentsRead,
  ACCESS_PERMISSIONS.beneficiariesRead,
  ACCESS_PERMISSIONS.providersRead,
  REFERENCE_READ,
] as const;
const T4_CREATE_AND_VALIDATE = [
  ACCESS_PERMISSIONS.attestationsRead,
  ACCESS_PERMISSIONS.attestationsWrite,
  ACCESS_PERMISSIONS.attestationsValidate,
] as const;
const T5_VALIDATION_ACTIONS = [
  ACCESS_PERMISSIONS.invoiceValidate,
  ACCESS_PERMISSIONS.invoiceReturnForCorrection,
] as const;
const T5_ENTRY_ACTIONS = [
  ACCESS_PERMISSIONS.invoiceSendForValidation,
  ACCESS_PERMISSIONS.invoiceReturnToProvider,
  ACCESS_PERMISSIONS.invoiceEditInformation,
  ACCESS_PERMISSIONS.invoiceEditAmounts,
  ACCESS_PERMISSIONS.followUpCreate,
  ACCESS_PERMISSIONS.followUpEdit,
  ACCESS_PERMISSIONS.followUpDelete,
] as const;

export const ACCESS_ROLE_DEFINITIONS = [
  {
    code: 'ASSISTANT',
    libelle: 'Assistant',
    permissions: [
      ...T1_T3_READ,
      ACCESS_PERMISSIONS.attestationsRead,
      ACCESS_PERMISSIONS.attestationsWrite,
      ACCESS_PERMISSIONS.notificationsRead,
      ACCESS_PERMISSIONS.invoicesRead,
      ACCESS_PERMISSIONS.invoicesWrite,
      ACCESS_PERMISSIONS.invoiceSendForValidation,
      ACCESS_PERMISSIONS.invoiceReturnToProvider,
      ACCESS_PERMISSIONS.invoiceEditInformation,
      ACCESS_PERMISSIONS.invoiceEditAmounts,
      ACCESS_PERMISSIONS.invoiceExit,
    ],
  },
  {
    code: 'CONTROLEUR',
    libelle: 'Attaché (contrôleur)',
    permissions: [
      ...T1_T3_READ,
      ...T4_CREATE_AND_VALIDATE,
      ACCESS_PERMISSIONS.notificationsRead,
      ACCESS_PERMISSIONS.invoicesRead,
      ACCESS_PERMISSIONS.invoicesWrite,
      ACCESS_PERMISSIONS.followUpRead,
      ACCESS_PERMISSIONS.followUpWrite,
      ACCESS_PERMISSIONS.followUpCreate,
      ACCESS_PERMISSIONS.followUpEdit,
      ACCESS_PERMISSIONS.followUpDelete,
      ...T5_ENTRY_ACTIONS,
    ],
  },
  {
    code: 'ADJOINT',
    libelle: 'Gestionnaire frais médicaux (Adjoint)',
    permissions: [
      ...T1_T3_READ,
      ACCESS_PERMISSIONS.agentsWrite,
      ACCESS_PERMISSIONS.beneficiariesWrite,
      ACCESS_PERMISSIONS.providersWrite,
      ...T4_CREATE_AND_VALIDATE,
      ACCESS_PERMISSIONS.notificationsRead,
      ACCESS_PERMISSIONS.invoicesRead,
      ACCESS_PERMISSIONS.invoicesValidate,
      ACCESS_PERMISSIONS.followUpRead,
      ACCESS_PERMISSIONS.t6Read,
      ACCESS_PERMISSIONS.t6Write,
      ACCESS_PERMISSIONS.followUpCreate,
      ACCESS_PERMISSIONS.followUpEdit,
      ACCESS_PERMISSIONS.followUpDelete,
      ...T5_VALIDATION_ACTIONS,
    ],
  },
  {
    code: 'CHEF_SERVICE',
    libelle: 'Chef du service',
    permissions: [
      ...T1_T3_READ,
      ACCESS_PERMISSIONS.agentsWrite,
      ACCESS_PERMISSIONS.beneficiariesWrite,
      ACCESS_PERMISSIONS.providersWrite,
      ...T4_CREATE_AND_VALIDATE,
      ACCESS_PERMISSIONS.notificationsRead,
      ACCESS_PERMISSIONS.invoicesRead,
      ACCESS_PERMISSIONS.invoicesValidate,
      ACCESS_PERMISSIONS.followUpRead,
      ACCESS_PERMISSIONS.t6Read,
      ...T5_VALIDATION_ACTIONS,
    ],
  },
  {
    code: 'DRH',
    libelle: 'DRH / Responsable',
    permissions: [
      ...T1_T3_READ,
      ACCESS_PERMISSIONS.attestationsRead,
      ACCESS_PERMISSIONS.attestationsValidate,
      ACCESS_PERMISSIONS.notificationsRead,
      ACCESS_PERMISSIONS.invoicesRead,
      ACCESS_PERMISSIONS.followUpRead,
      ACCESS_PERMISSIONS.reportingRead,
    ],
  },
  {
    code: 'ADMINISTRATEUR',
    libelle: 'Administrateur',
    permissions: ACCESS_PERMISSION_DEFINITIONS.map(({ code }) => code),
  },
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Readonly<
  Record<string, readonly AccessPermissionCode[]>
> = Object.fromEntries(
  ACCESS_ROLE_DEFINITIONS.map(({ code, permissions }) => [code, permissions]),
);

export function calculerPermissionsRoles(
  roleCodes: readonly string[],
  overrides: readonly {
    roleCode: string;
    permissionCode: string;
    autorisee: boolean;
  }[],
): Set<string> {
  const permissionsParDefaut = roleCodes.map(
    (code) => new Set<string>(DEFAULT_ROLE_PERMISSIONS[code] ?? []),
  );
  const overridesParRole = new Map<string, Map<string, boolean>>();
  for (const override of overrides) {
    let permissions = overridesParRole.get(override.roleCode);
    if (permissions === undefined) {
      permissions = new Map();
      overridesParRole.set(override.roleCode, permissions);
    }
    permissions.set(override.permissionCode, override.autorisee);
  }

  const permissionsCandidates = new Set<string>([
    ...permissionsParDefaut.flatMap((permissions) => [...permissions]),
    ...overrides.map(({ permissionCode }) => permissionCode),
  ]);
  return new Set(
    [...permissionsCandidates].filter((permissionCode) =>
      roleCodes.some((roleCode, index) => {
        const overridesRole = overridesParRole.get(roleCode);
        return overridesRole?.has(permissionCode)
          ? overridesRole.get(permissionCode) === true
          : permissionsParDefaut[index].has(permissionCode);
      }),
    ),
  );
}
