import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeConsommationT6 } from '../../../generated/prisma/enums.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class MedicamentConsommationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @ApiPropertyOptional({ description: 'Identifiant CIS du médicament BDPM.' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ enum: ['BDPM', 'RXNORM'] })
  @IsOptional()
  @IsIn(['BDPM', 'RXNORM'])
  source?: 'BDPM' | 'RXNORM';

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  rxcui?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  substanceActive?: string;
}

export class DetailLunettesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  typeVerre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monture?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  sphereOD?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  cylindreOD?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  axeOD?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  sphereOG?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  cylindreOG?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  axeOG?: number;
}

export class DetailConsommationT6Dto {
  @ApiProperty({ enum: TypeConsommationT6 })
  @IsEnum(TypeConsommationT6)
  type!: TypeConsommationT6;

  @ApiPropertyOptional({ type: Number, minimum: 0.01 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantite?: number;

  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Posologie saisie pour cette ligne T6.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  posologie?: string;

  @ApiPropertyOptional({ type: () => MedicamentConsommationDto })
  @ValidateIf((_objet: object, valeur: unknown) => valeur !== undefined)
  @ValidateNested()
  @Type(() => MedicamentConsommationDto)
  medicament?: MedicamentConsommationDto;

  @ApiPropertyOptional({ type: () => DetailLunettesDto })
  @ValidateIf((_objet: object, valeur: unknown) => valeur !== undefined)
  @ValidateNested()
  @Type(() => DetailLunettesDto)
  lunettes?: DetailLunettesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ConsommationT6QueryDto {
  @ApiPropertyOptional({ enum: TypeConsommationT6 })
  @IsOptional()
  @IsEnum(TypeConsommationT6)
  type?: TypeConsommationT6;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idp?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE)
  du?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE)
  au?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class RechercheMedicamentQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  terme!: string;
}
