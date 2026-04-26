import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: "rat-dnsipd-backend",
      timestamp: new Date().toISOString(),
    };
  }
}
