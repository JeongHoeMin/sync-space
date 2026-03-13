@echo off
setlocal

echo [1/4] Checking Docker status...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b
)

echo [2/4] Starting LiveKit server in a new window...
start "LiveKit Server" cmd /c "docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp -e LIVEKIT_BIND_ADDRESSES=0.0.0.0 -e LIVEKIT_CORS_ALLOWED_ORIGINS="*" livekit/livekit-server --dev --node-ip 127.0.0.1"

echo [3/4] Starting Backend Server (NestJS) in a new window...
cd /d "d:\workspace\github\SyncSpace\sync-space-server"
start "SyncSpace Backend" cmd /c "npm run start:dev"

echo [4/4] Starting Frontend App (Electron) in a new window...
cd /d "d:\workspace\github\SyncSpace\sync-space-app"
echo Waiting for servers to initialize...
timeout /t 5 >nul
start "SyncSpace App" cmd /c "npm run dev"

echo.
echo ==================================================
echo All systems are starting. 
echo 1. Wait for the Backend window to show "Nest application successfully started".
echo 2. Click "채널 접속하기" in the Electron app.
echo ==================================================
pause
