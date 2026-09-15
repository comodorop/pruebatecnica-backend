import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318';

// Prometheus scrapea /metrics cada 5s y no aporta nada trazar esas llamadas
// (ni el healthcheck): solo generan ruido que ahoga las trazas de negocio reales.
const IGNORED_PATHS = new Set(['/metrics', '/health']);
const ignoreIncomingRequestHook = (req: { url?: string }) => {
  const path = req.url?.split('?')[0];
  return path ? IGNORED_PATHS.has(path) : false;
};

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'backend',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.1',
  }),
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { ignoreIncomingRequestHook },
    }),
    new NestInstrumentation(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
