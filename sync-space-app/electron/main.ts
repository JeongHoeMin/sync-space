import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [추가] 자가 서명 인증서(mkcert 등)의 신뢰 문제를 해결하기 위한 가장 강력한 방법입니다.
// 특정 PC의 시스템 보안 정책이 엄격하여 이벤트 기반 무시가 작동하지 않을 때 효과적입니다.
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    width: 900,
    height: 700,
    transparent: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 기본적인 메뉴 제거
  win.setMenu(null);

  win.webContents.on('did-finish-load', () => {
    console.log('Main window finished loading');
    win?.show();
    win?.focus();
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL} with error: ${errorDescription} (${errorCode})`);
  });

  // 렌더러 로그를 메인 터미널로 전달
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    console.log(`[RENDERER-${levels[level] || 'LOG'}] ${message} (${sourceId}:${line})`);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(process.env.DIST || '', 'index.html');
    console.log(`Loading production index from: ${indexPath}`);
    win.loadFile(indexPath).catch(err => {
      console.error('Failed to load file:', err);
    });
  }

  win.webContents.openDevTools(); // 확실하게 확인하기 위해 다시 켬
}

// 렌더러 프로세스로부터 클릭 스루 상태를 제어받기 위한 IPC 통신
ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// 화면 캡처 소스 권한 취득 IPC 통신 예시
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 300, height: 300 } });
  return sources.map(src => ({
    id: src.id,
    name: src.name,
    thumbnail: src.thumbnail.toDataURL(), // Send direct DataURL string
  }));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// [추가] 개발 및 테스트 환경에서 자가 서명 인증서(mkcert 등)의 신뢰 문제를 해결하기 위해 인증서 오류를 무시합니다.
// 타 PC에서 접속하는 클라이언트에서도 정상적으로 작동하기 위해 가드를 제거했습니다.
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // 현재 서비스 중인 IP(19.19.20.49)에 대해서만 예외 처리하는 것이 보안상 좋으나, 테스트 편의를 위해 전체 허용합니다.
  event.preventDefault();
  callback(true);
});

app.whenReady().then(createWindow);
