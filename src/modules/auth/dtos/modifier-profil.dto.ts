import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ModifierProfilDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom affiché est obligatoire.' })
  @MaxLength(120)
  nom!: string;
}
