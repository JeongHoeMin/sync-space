import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * 이메일별 활성 소켓 Set을 관리하는 세션 서비스
 *
 * 설계 원칙:
 * - 소켓 연결 시에는 kick하지 않음 (사용자당 소켓 여러 개 존재 가능: useForceLogout, ChatPanel 등)
 * - 로그인 API 호출 시 해당 이메일의 모든 소켓을 kick (중복 로그인 차단)
 */
@Injectable()
export class SessionService {
  private server: Server | null = null;

  // email → Set<socketId>
  private readonly sessions = new Map<string, Set<string>>();

  /** AppGateway.afterInit에서 호출 */
  setServer(server: Server): void {
    this.server = server;
  }

  /** 소켓 연결 시 등록 */
  registerSocket(email: string, socketId: string): void {
    if (!this.sessions.has(email)) {
      this.sessions.set(email, new Set());
    }
    this.sessions.get(email)!.add(socketId);
  }

  /** 소켓 해제 시 제거 */
  removeSocket(email: string, socketId: string): void {
    const set = this.sessions.get(email);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) this.sessions.delete(email);
    }
  }

  /**
   * 해당 이메일의 모든 활성 소켓에 force_logout 이벤트 발송 후 연결 해제
   * 로그인 API에서 신규 토큰 발급 직전에 호출
   */
  kickAllSockets(email: string, reason: string): void {
    if (!this.server) return;
    const socketIds = this.sessions.get(email);
    if (!socketIds || socketIds.size === 0) return;

    console.log(`[SessionService] Kicking ${socketIds.size} socket(s) for ${email}`);
    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('force_logout', { reason });
        socket.disconnect(true);
      }
    }
    this.sessions.delete(email);
  }
}
