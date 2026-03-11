import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  getUploadUrl(filename: string): string {
    // 호스트 도메인은 추후 환경 변수로 분리 가능
    return `http://localhost:3000/uploads/${filename}`;
  }
}
