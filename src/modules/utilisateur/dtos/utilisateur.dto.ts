import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { RoleUtilisateur } from '../../../generated/prisma/enums.js';

const nettoyerNom = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const nettoyerEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreerUtilisateurDto {
  @Transform(nettoyerNom)
  @IsString({ message: 'Le nom doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @Matches(/\S/, { message: 'Le nom ne peut pas être vide.' })
  nom!: string;

  @Transform(nettoyerEmail)
  @IsEmail({}, { message: 'L’adresse email est invalide.' })
  email!: string;

  @IsOptional()
  @IsEnum(RoleUtilisateur, { message: 'Le rôle historique est invalide.' })
  role?: RoleUtilisateur;

  @IsOptional()
  @IsArray({ message: 'roles doit être un tableau.' })
  @ArrayNotEmpty({ message: 'Au moins un rôle doit être fourni.' })
  @IsString({ each: true, message: 'Chaque rôle doit être une chaîne.' })
  roles?: string[];
}

export class ModifierUtilisateurDto {
  @IsOptional()
  @Transform(nettoyerNom)
  @IsString({ message: 'Le nom doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide.' })
  @Matches(/\S/, { message: 'Le nom ne peut pas être vide.' })
  nom?: string;

  @IsOptional()
  @Transform(nettoyerEmail)
  @IsEmail({}, { message: 'L’adresse email est invalide.' })
  email?: string;

  @IsOptional()
  @IsEnum(RoleUtilisateur, { message: 'Le rôle est invalide.' })
  role?: RoleUtilisateur;

  @IsOptional()
  @IsArray({ message: 'roles doit être un tableau.' })
  @ArrayNotEmpty({ message: 'Au moins un rôle doit être fourni.' })
  @IsString({ each: true, message: 'Chaque rôle doit être une chaîne.' })
  roles?: string[];
}
