import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * 서버로부터 force_logout 이벤트를 수신하면 자동으로 로그아웃 처리하는 훅
 * DashboardPage, RoomPage 등 로그인 후 모든 페이지에서 사용
 */
export function useForceLogout() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 강제 로그아웃 감지 전용 소켓 (ChatPanel과 별개)
    const socket = io(API_URL, {
      auth: { token },
      reconnection: false, // 강제 해제 후 재연결 시도 방지
    });

    socket.on('force_logout', (data: { reason: string }) => {
      console.warn('[force_logout]', data.reason);
      socket.disconnect();
      localStorage.removeItem('token');
      localStorage.removeItem('autoLogin');
      // 강제 로그아웃 메시지와 함께 로그인 화면으로 이동
      navigate('/', { state: { forceLogout: true, reason: data.reason } });
    });

    socket.on('connect_error', () => {
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);
}
