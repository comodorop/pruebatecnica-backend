import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap() {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@deborix.test';
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
    const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return;
    }

    await this.usersService.create({ email, password, name });
    this.logger.log(`Usuario semilla creado: ${email}`);
  }
}
