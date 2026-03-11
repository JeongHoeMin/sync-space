import { Module, HttpException, HttpStatus } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = crypto.randomUUID() + extname(file.originalname);
          cb(null, uniqueSuffix);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB 제한
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/x-zip'
        ];
        if (!allowedTypes.includes(file.mimetype)) {
          return cb(new HttpException('지원하지 않는 파일 형식입니다', HttpStatus.UNSUPPORTED_MEDIA_TYPE), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
