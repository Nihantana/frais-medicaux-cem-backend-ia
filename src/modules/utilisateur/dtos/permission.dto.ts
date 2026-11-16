import { IsBoolean } from 'class-validator';

export class ModifierPermissionDto {
  @IsBoolean({ message: 'autorisee doit être un booléen.' })
  autorisee!: boolean;
}
