# Jeu de test IA — contrôle visuel des factures

Ce fichier est actualisé par `npm run seed:jeu-test-ia`. Les IDs numériques correspondent à la dernière exécution réussie; après `--clean`, relancer le seed pour les régénérer.

| Scénario | ID facture | Numéro de facture | Fichier joint    | Résultat attendu                                                  |
| -------- | ---------: | ----------------- | ---------------- | ----------------------------------------------------------------- |
| S01      |         22 | `DEMO-IA-S01`     | DEMO-IA-S01.pdf  | `CONFORME`, T6/T5 concordants                                     |
| S02      |         23 | `DEMO-IA-S02`     | DEMO-IA-S02.pdf  | `MONTANT_FACTURE_DIFFERENT`                                       |
| S03      |         24 | `DEMO-IA-S03`     | DEMO-IA-S03.pdf  | `MONTANT_CHIFFRES_LETTRES_DIFFERENT`                              |
| S04      |         25 | `DEMO-IA-S04`     | DEMO-IA-S04.pdf  | `DESTINATAIRE_INCORRECT`                                          |
| S05      |         26 | `DEMO-IA-S05`     | DEMO-IA-S05.pdf  | `PRESTATAIRE_DIFFERENT`                                           |
| S06      |         27 | `DEMO-IA-S06`     | DEMO-IA-S06.pdf  | `DATE_FACTURE_DIFFERENTE`                                         |
| S07      |         28 | `DEMO-IA-S07`     | Aucune           | `PIECES_JOINTES_MANQUANTES`                                       |
| S08      |         29 | `DEMO-IA-S08`     | DEMO-IA-S08.pdf  | `ATTESTATION_DEJA_CONSOMMEE`                                      |
| S09      |         30 | `DEMO-IA-S09`     | DEMO-IA-S09.pdf  | `ATTESTATION_INVALIDE`                                            |
| S10      |         31 | `DEMO-IA-S10`     | DEMO-IA-S10.pdf  | `ATTESTATION_PRESTATAIRE_DIFFERENT`                               |
| S11      |         32 | `DEMO-IA-S11`     | DEMO-IA-S11.pdf  | `ATTESTATION_APRES_FACTURE`                                       |
| S12      |         33 | `DEMO-IA-S12`     | DEMO-IA-S12.pdf  | `ATTESTATION_BENEFICIAIRE_DIFFERENT`                              |
| S13      |         34 | `DEMO-IA-S13`     | DEMO-IA-S13.pdf  | `ATTESTATION_PAR_ACTE_INSUFFISANTE`                               |
| S14      |         35 | `DEMO-IA-S14`     | DEMO-IA-S14.pdf  | `ACTE_ATTESTATION_SEMANTIQUE_A_VERIFIER` (60–82 %)                |
| S15      |         36 | `DEMO-IA-S15`     | DEMO-IA-S15.jpg  | `A_VERIFIER` (texte illisible)                                    |
| S16A     |         37 | `DEMO-IA-S16A`    | DEMO-IA-S16A.pdf | Statut `VALIDEE`, clôturée, T6/T5 concordants                     |
| S16B     |         38 | `DEMO-IA-S16B`    | DEMO-IA-S16B.pdf | Statut `A_CORRIGER`                                               |
| S16C     |         39 | `DEMO-IA-S16C`    | DEMO-IA-S16C.pdf | Statut `RETOURNEE`                                                |
| S17      |         40 | `DEMO-IA-S17`     | DEMO-IA-S17.pdf  | `concordant: false` (montant T6 discordant)                       |
| S18      |         41 | `DEMO-IA-S18`     | DEMO-IA-S18.pdf  | Statut `VALIDEE`, concordante; refPaie présente, affectation vide |
| S19      |         42 | `DEMO-IA-S19`     | DEMO-IA-S19.pdf  | Facture clôturée; affectation et mouvement `CLOTURE` présents     |

## Notes

- S16 est décliné en trois factures pour tester séparément `VALIDEE` clôturée, `A_CORRIGER` et `RETOURNEE`.
- Un PDF est généré et stocké pour chaque facture. S07 conserve son PDF hors de la facture pour rester sans pièce jointe; S15 conserve son PDF hors de la facture et joint uniquement l’image floue.
- S14 rapproche « Visite médicale générale » de la nature « Consultation généraliste ». Le score mesuré avec `bge-m3:latest` est d’environ 65 %, dans la plage attendue de 60 à 82 %.
- Seules S01, S16A et S17–S19 ont un contrôle visuel `CONFORME`, des lignes T6 et des lignes T5. Le seed crée 11 lignes pour chaque table; les autres factures n’en ont pas.
- Chaque ligne T6 possède une attestation de prise en charge distincte afin que les réponses API ne signalent pas de réutilisation d’attestation.
- S17 a une ligne T6 majorée de 1 000 Ariary après calcul des totaux afin de produire `concordant: false`. S18 est prête pour la paie de mars 2026 avec une référence de paie et sans mois d’affectation; S19 est clôturée via `CloturePaieService`.
- Deux plafonds historiques temporaires pour `REA-02` reprennent les valeurs réelles en vigueur au 14/11/2026 et s’appliquent du 01/01/2026 au 13/11/2026. Les plafonds actuels et les autres référentiels restent inchangés; `--clean` retire ces deux versions.
- Les trois référentiels de structure et le lieu sont lus en base, jamais créés ou modifiés. Les actes sont les codes existants `CON-01`, `LAB-01`, `IMG-01` et `REA-02`.
- Les scénarios S16 restent préparés pour leurs statuts; seules S16A reçoit les lignes de phase 2. Sa clôture passe par `CloturePaieService`.

Pour supprimer uniquement ces données et leurs fichiers : `npm run seed:jeu-test-ia -- --clean`.
