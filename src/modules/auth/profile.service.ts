import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Readable } from 'node:stream';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FileStorageService } from '../../infrastructure/storage/file-storage.service.js';
import type { UtilisateurAuthentifie } from './auth.types.js';

const UTILISATEUR_PROFIL = {
  id: true,
  nom: true,
  email: true,
  photoPath: true,
  rolesAssignees: { select: { role: { select: { code: true } } } },
} as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async modifierNom(
    id: number,
    nom: string,
  ): Promise<UtilisateurAuthentifie> {
    const nomNettoye = nom.trim();
    if (nomNettoye === '') {
      throw new BadRequestException('Le nom affiché est obligatoire.');
    }
    const utilisateur = await this.prisma.utilisateur.update({
      where: { id },
      data: { nom: nomNettoye },
      select: UTILISATEUR_PROFIL,
    });
    return this.formaterUtilisateur(utilisateur);
  }

  async modifierPhoto(
    id: number,
    image: Express.Multer.File,
  ): Promise<UtilisateurAuthentifie> {
    const existant = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: { photoPath: true },
    });
    if (existant === null) {
      throw new NotFoundException("L'utilisateur est introuvable.");
    }

    const nouveauChemin = await this.fileStorage.saveImage(image, 'profile');
    let utilisateur;
    try {
      utilisateur = await this.prisma.utilisateur.update({
        where: { id },
        data: { photoPath: nouveauChemin },
        select: UTILISATEUR_PROFIL,
      });
    } catch (error: unknown) {
      await this.fileStorage.deleteImage(nouveauChemin);
      throw error;
    }

    if (existant.photoPath !== null) {
      await this.fileStorage.deleteImage(existant.photoPath);
    }
    return this.formaterUtilisateur(utilisateur);
  }

  async obtenirCheminPhoto(id: number): Promise<string> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      select: { photoPath: true },
    });
    if (utilisateur === null || utilisateur.photoPath === null) {
      throw new NotFoundException("Aucune photo de profil n'est enregistrée.");
    }
    return utilisateur.photoPath;
  }

  ouvrirPhoto(chemin: string): Promise<Readable | null> {
    return this.fileStorage.openImage(chemin);
  }

  private formaterUtilisateur(utilisateur: {
    id: number;
    nom: string;
    email: string | null;
    photoPath: string | null;
    rolesAssignees: { role: { code: string } }[];
  }): UtilisateurAuthentifie {
    if (utilisateur.email === null) {
      throw new NotFoundException("L'utilisateur n'a pas d'adresse e-mail.");
    }
    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      roles: utilisateur.rolesAssignees.map(({ role }) => role.code),
      hasPhoto: utilisateur.photoPath !== null,
    };
  }
}
