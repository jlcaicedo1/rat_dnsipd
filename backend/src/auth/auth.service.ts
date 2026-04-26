import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto) {
    if (!dto.username || !dto.password) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const user = {
      id: 1,
      nombre: "Administrador",
      email: "admin@sistema.local",
      username: dto.username,
      roles: ["ADMIN"],
    };

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      roles: user.roles,
    });

    return {
      data: {
        accessToken,
        user,
      },
    };
  }
}
