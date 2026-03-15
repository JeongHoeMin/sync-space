import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  getUploadUrl(filename: string): string {
    // APP_URL 환경변수로 호스트 도메인 관리 (HTTPS 전환 시 환경변수만 수정)
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${appUrl}/uploads/${filename}`;
  }
}
