import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { spawn } from 'node:child_process';
import { pdf as pdfToImg } from 'pdf-to-img';
import { env } from '../../common/settings/env.validator.js';

@Injectable()
export class VerificationFactureOcrService {
  async extraire(
    buffer: Buffer,
    typeFichier: string,
  ): Promise<string> {
    if (typeFichier === 'application/pdf') {
      return this.extrairePdf(buffer);
    }
    if (typeFichier === 'image/jpeg' || typeFichier === 'image/png') {
      return this.executerTesseract(buffer);
    }
    throw new UnprocessableEntityException(
      `Le type de fichier ${typeFichier} ne peut pas être traité par OCR.`,
    );
  }

  private async extrairePdf(buffer: Buffer): Promise<string> {
    const document = await pdfToImg(buffer, { scale: 2 });
    const pages: string[] = [];

    try {
      for await (const page of document) {
        pages.push(await this.executerTesseract(page));
      }
    } finally {
      await document.destroy();
    }

    return pages.join('\n\n--- PAGE SUIVANTE ---\n\n');
  }

  private executerTesseract(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const processus = spawn(
        env.TESSERACT_COMMAND,
        ['stdin', 'stdout', '-l', env.OCR_LANGUAGE, '--psm', '6'],
        { windowsHide: true },
      );
      const sortie: Buffer[] = [];
      const erreur: Buffer[] = [];

      processus.stdout.on('data', (chunk: Buffer) => sortie.push(chunk));
      processus.stderr.on('data', (chunk: Buffer) => erreur.push(chunk));
      processus.once('error', (cause: Error) => {
        reject(
          new ServiceUnavailableException(
            `Tesseract est indisponible (${env.TESSERACT_COMMAND}).`,
            { cause },
          ),
        );
      });
      processus.once('close', (code) => {
        if (code !== 0) {
          reject(
            new ServiceUnavailableException(
              `Tesseract a échoué : ${Buffer.concat(erreur).toString('utf8').trim()}`,
            ),
          );
          return;
        }
        resolve(Buffer.concat(sortie).toString('utf8').trim());
      });

      processus.stdin.end(buffer);
    });
  }
}
