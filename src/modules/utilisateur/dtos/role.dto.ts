import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const nettoyer = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreerRoleDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Le code du rôle doit contenir des lettres, chiffres ou _.',
  })
  code!: string;

  @Transform(nettoyer)
  @IsString()
  @IsNotEmpty()
  libelle!: string;
}

export class ModifierRoleDto {
  @IsOptional()
  @Transform(nettoyer)
  @IsString()
  @IsNotEmpty()
  libelle?: string;
}
