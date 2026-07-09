import {
  BadRequestException,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ImportRatService } from './import-rat.service';

type UploadedXlsxFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Controller('admin/import')
export class ImportRatController {
  constructor(private readonly importRatService: ImportRatService) {}

  @Post('rat-matrix/:dependenciaId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream',
        ];
        if (!allowed.includes(file.mimetype) && !file.originalname.match(/\.xlsx?$/i)) {
          cb(new BadRequestException('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async importMatrix(
    @Param('dependenciaId', ParseIntPipe) dependenciaId: number,
    @UploadedFile() file: UploadedXlsxFile,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel');
    }
    const result = await this.importRatService.importMatrix(
      file.buffer,
      dependenciaId,
      actor,
    );
    return { data: result };
  }
}

