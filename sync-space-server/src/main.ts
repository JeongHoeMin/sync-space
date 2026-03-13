import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { json, urlencoded } from 'express';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // [수정] 판서 데이터 등 대용량 JSON 페이로드 수신을 위해 제한 상향 (100kb -> 50mb)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  
  // 정적 파일 서빙 (이미지 등 업로드 파일)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // CORS 설정 (프론트엔드 통신용)
  app.enableCors({
    origin: '*', // 개발 중에는 모든 출처 허용
    credentials: true,
  });

  // 전역 파이프 (유효성 검증용)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log(`SyncSpace Server is running on: http://localhost:3000`);
}
bootstrap();
