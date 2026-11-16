import { ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { StatutFacture, TypeMouvement } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { FactureIndividuelleService } from '../individuelle/facture-individuelle.service.js';
import { MouvementFactureService } from '../../shared/mouvement-facture.service.js';

@Injectable()
export class CloturePaieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facturesIndividuelles: FactureIndividuelleService,
    private readonly mouvements: MouvementFactureService,
  ) {}

  async cloturer(factureId: number, mois: string, dateCloture: string, auteurId: number) {
    const moisPaie = new Date(`${mois}-01T00:00:00.000Z`);
    const dateMetierCloture = new Date(`${dateCloture}T00:00:00.000Z`);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "facturation"."facture_globale"
        WHERE "id" = ${factureId} FOR UPDATE
      `;
      const facture = await tx.factureGlobale.findUnique({
        where: { id: factureId },
        select: { id: true, refSociale: true, statut: true, dateCloture: true },
      });
      if (facture === null) throw new NotFoundException(`La facture ${factureId} est introuvable.`);
      if (facture.statut === StatutFacture.SUPPRIMEE) {
        throw new HttpException([{ factureId, refSociale: facture.refSociale, raison: 'SUPPRIMEE' }], 409);
      }
      if (facture.dateCloture !== null) {
        throw new HttpException([{ factureId, refSociale: facture.refSociale, raison: 'DEJA_CLOTUREE' }], 409);
      }
      const miseAJour = await tx.factureGlobale.updateMany({
        where: { id: factureId, dateCloture: null },
        data: { moisPaie, dateCloture: dateMetierCloture },
      });
      if (miseAJour.count !== 1) throw new ConflictException('La facture a déjà été clôturée.');
      await tx.factureIndividuelle.updateMany({
        where: { factureGlobaleId: factureId },
        data: { moisAffectation: moisPaie },
      });
      const total = await this.facturesIndividuelles.totalAgent(factureId, tx);
      await this.mouvements.ecrire(tx, {
        factureGlobaleId: factureId,
        type: TypeMouvement.CLOTURE,
        date: dateMetierCloture,
        effectueParId: auteurId,
      });
      return {
        moisPaie: mois,
        dateCloture,
        factures: [{ id: facture.id, refSociale: facture.refSociale, ...total }],
      };
    });
  }
}
