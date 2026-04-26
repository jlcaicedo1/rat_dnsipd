import { Injectable } from "@nestjs/common";

@Injectable()
export class TipoProcesoService {
  findAll() {
    return { data: [] };
  }
}
