import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'nuevo.usuario@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperSegura123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
