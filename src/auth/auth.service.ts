import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateCredentials(email, password);
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    // Reutiliza findById para que avatarUrl salga como URL firmada, igual que en
    // el resto de endpoints (no se puede usar el `user` de arriba directamente:
    // trae la key cruda de S3, no la URL).
    return { accessToken, user: await this.usersService.findById(user.id) };
  }
}
