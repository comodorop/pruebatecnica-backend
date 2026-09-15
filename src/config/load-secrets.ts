/**
 * Si SECRETS_MANAGER_SECRET_ID está definido, trae ese secreto de AWS Secrets
 * Manager (JSON plano clave/valor) y sobreescribe esas variables de entorno.
 * Si no está definido, no hace nada (desarrollo local sin AWS).
 */
async function fetchSecretsManagerValues(): Promise<void> {
  const secretId = process.env.SECRETS_MANAGER_SECRET_ID;
  if (!secretId) return;

  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) {
    throw new Error(`El secreto "${secretId}" no tiene SecretString (¿es binario?)`);
  }

  const secrets: Record<string, string> = JSON.parse(response.SecretString);
  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value;
  }

  // eslint-disable-next-line no-console
  console.log(`[secrets] Cargados desde Secrets Manager (${secretId}): ${Object.keys(secrets).join(', ')}`);
}

/**
 * Si el secreto ya trae DATABASE_URL completa (p. ej. Neon u otro Postgres
 * gestionado), se usa tal cual. Si no, se arma a partir de piezas sueltas
 * (POSTGRES_HOST/USER/PASSWORD/DB) — caso de un Postgres propio en Docker.
 */
function buildDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;

  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const user = process.env.POSTGRES_USER ?? 'app';
  const password = process.env.POSTGRES_PASSWORD ?? '';
  const db = process.env.POSTGRES_DB ?? 'app';
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:5432/${db}?schema=public`;
}

export async function loadSecrets(): Promise<void> {
  await fetchSecretsManagerValues();
  buildDatabaseUrl();
}
