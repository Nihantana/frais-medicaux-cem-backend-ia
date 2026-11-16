import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EnvoyerMessageDiscussionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  contenu!: string;
}
