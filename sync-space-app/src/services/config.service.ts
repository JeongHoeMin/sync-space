class ConfigService {
  private static instance: ConfigService;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 백엔드 API 서버 URL을 반환합니다.
   */
  public getApiUrl(): string {
    return import.meta.env.VITE_API_URL || 'https://localhost:3000';
  }

  /**
   * LiveKit 서버 URL (WebSocket)을 반환합니다.
   */
  public getLiveKitUrl(): string {
    // 윈도우 환경 포트 충돌 방지를 위해 기본값 7885 사용
    return import.meta.env.VITE_LIVEKIT_URL || 'wss://127.0.0.1:7885';
  }

  /**
   * Electron 환경 여부를 반환합니다.
   */
  public getIsElectron(): boolean {
    return !!window.electronAPI;
  }
}

export const configService = ConfigService.getInstance();
