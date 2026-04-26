import { Injectable } from "@nestjs/common";

@Injectable()
export class CatalogosService {
  findAll(tipo?: string) {
    return {
      data: [],
      filters: { tipo: tipo ?? null },
    };
  }
}
