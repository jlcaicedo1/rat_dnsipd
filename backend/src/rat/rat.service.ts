import { Injectable } from "@nestjs/common";
import { CreateRatDto } from "./dto/create-rat.dto";

@Injectable()
export class RatService {
  findAll() {
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }

  findOne(id: number) {
    return { data: { id } };
  }

  create(dto: CreateRatDto) {
    return {
      data: {
        ...dto,
        estadoGeneral: "EN_CONSTRUCCION",
        versionInicial: {
          numeroVersion: "1.0",
          estadoVersion: "BORRADOR",
        },
      },
    };
  }
}
