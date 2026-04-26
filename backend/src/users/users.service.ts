import { Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  findAll() {
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }

  findOne(id: number) {
    return { data: { id } };
  }

  create(dto: CreateUserDto) {
    return { data: dto };
  }
}
