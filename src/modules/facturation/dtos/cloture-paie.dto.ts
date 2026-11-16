import {
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloturerPaieDto {
  @ApiProperty({ example: '2026-03', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' })
  @Matches(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/)
  moisAffectation!: string;

  @ApiProperty({ example: '2026-03-25', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateCloture!: string;

}
