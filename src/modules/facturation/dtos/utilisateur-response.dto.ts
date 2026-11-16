import { ApiProperty } from '@nestjs/swagger';
export class UtilisateurResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nom!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ type: [String] })
  roles!: string[];
}

export class UtilisateurReponseAvecMessageDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UtilisateurResponseDto })
  utilisateur!: UtilisateurResponseDto;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
