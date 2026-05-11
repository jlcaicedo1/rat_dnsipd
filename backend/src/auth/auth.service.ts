import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    if (!dto.username || !dto.password) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      data: {
        accessToken,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          username: user.username,
          role: user.role,
          dependenciaId: user.dependenciaId,
          subdireccionId: user.subdireccionId,
          activo: user.activo,
        },
      },
    };
  }
}
