import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class QuestionAssistantFactureDto {
  @ApiProperty({
    description: 'Question de l’utilisateur au sujet de la facture.',
    example: 'Pourquoi cette facture a-t-elle été signalée ?',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;
}

export class ReponseAssistantFactureDto {
  @ApiProperty()
  reponse!: string;

  @ApiProperty({ type: String, isArray: true })
  sources!: string[];

  @ApiProperty()
  avertissement!: string;
}
