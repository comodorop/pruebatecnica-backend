import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggingModule } from './logging.module';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [LoggingModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
