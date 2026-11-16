import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  GraviteControle,
  StatutControleVisuel,
  StatutResultatControle,
} from '../../../generated/prisma/enums.js';
import type { ExtractionFacture } from '../verification-facture.types.js';

export class ExtractionFactureResponseDto implements ExtractionFacture {
  @ApiProperty({ nullable: true })
  destinataire!: string | null;

  @ApiProperty({ nullable: true })
  montantChiffres!: number | null;

  @ApiProperty({ nullable: true })
  montantLettres!: string | null;

  @ApiProperty({ nullable: true })
  montantLettresValeur!: number | null;

  @ApiProperty({ nullable: true })
  prestataire!: string | null;

  @ApiProperty({ nullable: true })
  beneficiaire!: string | null;

  @ApiProperty({ nullable: true })
  numeroFacture!: string | null;

  @ApiProperty({ nullable: true })
  dateFacture!: string | null;

  @ApiProperty({ type: String, isArray: true })
  actes!: string[];
}

export class ResultatControleResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: StatutResultatControle })
  statut!: StatutResultatControle;

  @ApiProperty({ enum: GraviteControle })
  gravite!: GraviteControle;

  @ApiProperty({ nullable: true })
  valeurAttendue!: string | null;

  @ApiProperty({ nullable: true })
  valeurTrouvee!: string | null;

  @ApiPropertyOptional({ nullable: true })
  preuve!: string | null;

  @ApiProperty({ nullable: true })
  confiance!: number | null;

  @ApiProperty()
  confirme!: boolean;
}

export class RapportControleVisuelResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  factureGlobaleId!: number;

  @ApiProperty({ enum: StatutControleVisuel })
  statut!: StatutControleVisuel;

  @ApiProperty({ nullable: true })
  score!: number | null;

  @ApiProperty({ type: ExtractionFactureResponseDto, nullable: true })
  extraction!: ExtractionFactureResponseDto | null;

  @ApiProperty({ type: ResultatControleResponseDto, isArray: true })
  resultats!: ResultatControleResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  confirmeParId!: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  confirmeLe!: Date | null;
}

export class RetourControleVisuelDto {
  @ApiProperty({
    description: 'Motif détaillé du retour au prestataire.',
    example: 'Le montant en chiffres ne correspond pas au montant en lettres.',
  })
  @IsString()
  @IsNotEmpty()
  remarque!: string;
}
