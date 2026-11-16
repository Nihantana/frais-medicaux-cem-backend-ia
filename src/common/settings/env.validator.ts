import 'dotenv/config';
import {
  cleanEnv,
  port,
  str,
  num,
  makeValidator,
  EnvError,
  EnvMissingError,
} from 'envalid';
import {
  EnvValidationError,
  EnvInvalidKeyError,
  EnvMissingKeyError,
  InvalidDirNameError,
} from '../errors/env.validation.error.js';

const DEFAULT_MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const SAFE_DIR_NAME = /^[A-Za-z0-9_-]+$/;

/** Restricts configurable storage subdirectories to safe single path segments. */
const dirName = makeValidator<string>((input) => {
  if (!SAFE_DIR_NAME.test(input)) {
    throw new InvalidDirNameError(input);
  }
  return input;
});

const validators = {
  NODE_ENV: str({
    choices: ['development', 'production'],
    default: 'development',
  }),
  DB_HOST: str({ default: 'localhost' }),
  DB_PORT: port({ default: 5432 }),
  DB_NAME: str({ default: 'cem_facturation' }),
  DB_USER: str({ default: 'postgres' }),
  DB_PASSWORD: str({ default: 'postgres' }),

  STORAGE_ROOT: str({ default: 'data' }),
  UPLOAD_MAX_IMAGE_SIZE: num({ default: DEFAULT_MAX_IMAGE_SIZE }),
  UPLOAD_MAX_PDF_SIZE: num({ default: 10 * 1024 * 1024 }),
  STORAGE_PDF_DIR: dirName({ default: 'pdf' }),
  STORAGE_PDF_ATTESTATION_DIR: dirName({ default: 'attestations' }),
  STORAGE_PDF_CONVENTION_DIR: dirName({ default: 'conventions' }),
  STORAGE_IMAGES_DIR: dirName({ default: 'images' }),
  STORAGE_CARTES_PROFESSIONNELLES_DIR: dirName({
    default: 'cartes-professionnelles',
  }),
  STORAGE_CARTES_SOCIALES_DIR: dirName({ default: 'cartes-sociales' }),

  TESSERACT_COMMAND: str({ default: 'tesseract' }),
  OCR_LANGUAGE: str({ default: 'fra' }),
  OLLAMA_BASE_URL: str({ default: 'http://localhost:11434' }),
  OLLAMA_TEXT_MODEL: str({ default: 'qwen2.5-coder:3b' }),
  OLLAMA_EMBEDDING_MODEL: str({ default: 'bge-m3:latest' }),
  OLLAMA_TIMEOUT_MS: num({ default: 120000 }),

  TRANSACTION_MAX_WAIT: num({ default: 10000 }),
  TRANSACTION_TIMEOUT: num({ default: 10000 }),

  KEYCLOAK_ISSUER_URL: str({ default: 'http://localhost:8080/realms/cem' }),
  KEYCLOAK_AUDIENCE: str({ default: 'cem-frontend' }),
  KEYCLOAK_JWKS_URL: str({
    default: 'http://localhost:8080/realms/cem/protocol/openid-connect/certs',
  }),
  KEYCLOAK_ADMIN_CLIENT_ID: str({ default: '' }),
  KEYCLOAK_ADMIN_CLIENT_SECRET: str({ default: '' }),
};

/** Converts envalid failures to application-specific startup errors. */
const toError = (key: string, err: unknown): Error => {
  if (err instanceof EnvMissingError) return new EnvMissingKeyError(key);
  if (err instanceof InvalidDirNameError) {
    return new EnvInvalidKeyError(
      key,
      `Invalid environment variable: ${key} - ${err.message}`,
    );
  }
  if (err instanceof EnvError) {
    return new EnvInvalidKeyError(
      key,
      `Invalid environment variable: ${key} - ${err.message}`,
    );
  }
  return new EnvValidationError(
    `Unexpected error for environment variable: ${key}`,
  );
};

const cleaned = cleanEnv(process.env, validators, {
  /** Aggregates invalid variables into one explicit startup failure. */
  reporter: ({ errors }) => {
    const list = Object.entries(errors).map(([key, err]) => toError(key, err));
    if (list.length === 0) return;

    const details = list.map((e) => `  - ${e.message}`).join('\n');
    throw new EnvValidationError(
      `Environment validation failed with ${list.length} error(s):\n${details}`,
      list,
    );
  },
});

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = cleaned;

const DATABASE_URL =
  `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}` +
  `@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

export const env = Object.freeze({
  ...cleaned,
  DATABASE_URL,
});
