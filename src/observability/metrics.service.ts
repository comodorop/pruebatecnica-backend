import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDurationSeconds: Histogram<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'backend_' });

    this.httpRequestsTotal = new Counter({
      name: 'backend_http_requests_total',
      help: 'Total de peticiones HTTP recibidas',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'backend_http_request_duration_seconds',
      help: 'Duracion de las peticiones HTTP en segundos',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }
}
