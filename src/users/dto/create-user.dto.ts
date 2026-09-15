import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'nuevo.usuario@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nuevo Usuario' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'SuperSegura123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
