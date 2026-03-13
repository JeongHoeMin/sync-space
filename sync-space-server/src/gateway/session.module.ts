import { Module } from '@nestjs/common';
import { SessionService } from './session.service';

/**
 * 세션 관리 공유 모듈
 * AppModule(AppGateway)과 AuthModule(AuthService) 모두에서 import하여
 * 동일한 SessionService 싱글턴 인스턴스를 공유합니다.
 */
@Module({
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
