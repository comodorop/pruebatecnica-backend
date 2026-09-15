#!/usr/bin/env node
/**
 * `prisma migrate deploy` corre como proceso de shell, no dentro de main.ts, así
 * que necesita DATABASE_URL ya puesto en el entorno ANTES de invocarlo. Este
 * entrypoint carga los secretos (Secrets Manager si aplica, o el fallback de
 * .env) y arma DATABASE_URL primero, corre la migración, y recién ahí arranca
 * la app -que vuelve a llamar a loadSecrets() por si se ejecuta sin pasar por
 * este entrypoint (ej. `node dist/main.js` directo en desarrollo local).
 */
const { execFileSync } = require('node:child_process');
const { loadSecrets } = require('../dist/config/load-secrets');

async function main() {
  await loadSecrets();

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });

  require('../dist/main.js');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
