import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { trace } from '@opentelemetry/api';

const lokiHost = process.env.LOKI_URL ?? 'http://loki:3100';
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'backend';
const logLevel = process.env.LOG_LEVEL ?? 'info';
const isProduction = process.env.NODE_ENV === 'production';

const targets = [
  isProduction
    ? { target: 'pino/file', level: logLevel, options: { destination: 1 } }
    : { target: 'pino-pretty', level: logLevel, options: { colorize: true, singleLine: true } },
  {
    target: 'pino-loki',
    level: logLevel,
    options: {
      host: lokiHost,
      batching: true,
      interval: 5,
      labels: { app: serviceName },
    },
  },
];

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: logLevel,
        autoLogging: true,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customProps: () => {
          const span = trace.getActiveSpan();
          const ctx = span?.spanContext();
          return ctx ? { traceId: ctx.traceId, spanId: ctx.spanId } : {};
        },
        transport: { targets },
      },
    }),
  ],
})
export class LoggingModule {}
