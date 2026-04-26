import { Injectable } from "@nestjs/common";

@Injectable()
export class DependenciaService {
  findAll() {
    return { data: [] };
  }
}
