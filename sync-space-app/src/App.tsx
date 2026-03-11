import React, { useState, useEffect, useRef } from 'react';
import { MonitorUp, PenTool, MousePointer2, Video, VideoOff, Mic, MicOff, LogOut } from 'lucide-react';
import { Room, RoomEvent, LocalParticipant, RemoteParticipant, LocalTrackPublication, LocalVideoTrack, RemoteTrack, Track } from 'livekit-client';

// preload.ts에서 연결해둔 API 타입
declare global {
  interface Window {
    electronAPI: {
      setIgnoreMouseEvents: (ignore: boolean) => void;
      getDesktopSources: () => Promise<any[]>;
      onMessage: (callback: (msg: string) => void) => void;
    };
  }
}

// 간단한 드로잉 데이터 타입 정의
interface DrawData {
  type: 'start' | 'draw' | 'end';
  x: number;
  y: number;
  color: string;
  size: number;
}

function App() {
  // 모드 상태
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  
  // 미디어 및 캔버스 Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // LiveKit Room 상태
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState<Track[]>([]);

  // TODO: 실제로는 로그인 시 받은 토큰을 활용해야 함 (테스트용 하드코딩 환경 대비)
  const WS_URL = 'ws://localhost:7880'; 

  // 드로잉 모드 토글 시 Electron 창 클릭 이벤트 통과 여부 조절
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(!isDrawingMode);
    }
  }, [isDrawingMode]);

  // 방 접속 (테스트용 더미 토큰 또는 백엔드에서 발급받은 토큰 필요)
  const joinRoom = async () => {
    try {
      // 1. 임시 토큰 요청 로직 (실제로는 fetch('/api/livekit/token', ...))
      const res = await fetch('http://localhost:3000/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token')}` // 로그인 토큰 필요
        },
        body: JSON.stringify({ channelId: 'test-room-1' })
      });
      
      const data = await res.json();
      if (!data.token) return alert('토큰 발급 실패: 로그인이 필요할 수 있습니다.');

      // 2. Room 인스턴스 생성 및 연결
      const newRoom = new Room();
      
      newRoom
        .on(RoomEvent.TrackSubscribed, (track: Track) => {
          setRemoteTracks(prev => [...prev, track]);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          setRemoteTracks(prev => prev.filter(t => t.sid !== track.sid));
        })
        .on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
          // DataChannel을 통한 패킷 수신 처리 (드로잉 좌표 동기화)
          const decoder = new TextDecoder();
          try {
            const data: DrawData = JSON.parse(decoder.decode(payload));
            drawFromRemote(data);
          } catch(e) {
             // 일반 채팅 메시지 등 예외
          }
        });

      await newRoom.connect(WS_URL, data.token);
      
      // 마이크/웹캠 활성화 (기본)
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      
      setRoom(newRoom);
      setIsConnected(true);
      
    } catch (e: any) {
      console.error(e);
      alert('방 접속 실패: ' + e.message);
    }
  };

  const leaveRoom = async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setRemoteTracks([]);
    }
  };

  const broadcastDrawData = (data: DrawData) => {
    if (!room || !isConnected) return;
    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(data));
    try {
      // DataPacket_Kind.RELIABLE (수신 보장) 보다는 빠른 LOSSY 추천
      room.localParticipant.publishData(payload, { reliable: false });
    } catch (e) {
      console.error(e);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX, e.clientY);
      
      broadcastDrawData({ type: 'start', x: e.clientX, y: e.clientY, color: '#ef4444', size: 3 });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 || !isDrawingMode) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(e.clientX, e.clientY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      broadcastDrawData({ type: 'draw', x: e.clientX, y: e.clientY, color: '#ef4444', size: 3 });
    }
  };

  // 다른 사용자가 그린 내용 수신 처리
  const drawFromRemote = (data: DrawData) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    if (data.type === 'start') {
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else if (data.type === 'draw') {
      ctx.lineTo(data.x, data.y);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.stroke();
    }
  };

  // 화면 공유 소스 모달
  const handleShareScreen = async () => {
    if (!window.electronAPI) return alert('데스크톱 앱 환경에서만 가능합니다.');
    const desktopSources = await window.electronAPI.getDesktopSources();
    setSources(desktopSources);
  };

  const selectSource = async (sourceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId },
        } as any, 
      });
      
      // 내 화면 렌더링
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // LiveKit 방에 연결되어 있다면 스트림(Track)을 Publish
      if (room && isConnected) {
        const videoTrack = stream.getVideoTracks()[0];
        const localVideoTrack = new LocalVideoTrack(videoTrack);
        await room.localParticipant.publishTrack(localVideoTrack, { name: 'screen-share' });
      }

      setSources([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-screen h-screen relative bg-transparent overflow-hidden object-cover select-none pointer-events-none">
      
      {/* 백그라운드에 공유 중인 비디오 렌더링 (시청자 입장 테스트용 또는 캡처용) */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain -z-10" />

      {/* 접속 제어 패널 (화면 하단 모서리) */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl shadow-2xl pointer-events-auto z-50 flex items-center gap-4">
        {!isConnected ? (
           <button onClick={joinRoom} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded">
             채널 입장 테스트
           </button>
        ) : (
           <div className="flex items-center gap-4">
             <span className="text-green-400 font-bold whitespace-nowrap">연결됨</span>
             <button onClick={leaveRoom} className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full">
               <LogOut size={20} />
             </button>
           </div>
        )}
      </div>

      {/* 우측 상단 플로팅 메뉴 (여기만 이벤트 개입) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto z-50">
         <button 
           className="p-3 bg-zinc-900/80 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-indigo-600 transition-colors duration-200"
           onClick={handleShareScreen}
           title="화면 공유 버튼"
         >
           <MonitorUp size={24} />
         </button>
         
         <button 
           className={`p-3 rounded-full shadow-lg transition-colors duration-200 backdrop-blur-md ${isDrawingMode ? 'bg-indigo-500 text-white' : 'bg-zinc-900/80 text-gray-300 hover:text-white'}`}
           onClick={() => setIsDrawingMode(!isDrawingMode)}
           title="판서 모드 스위치"
         >
           {isDrawingMode ? <PenTool size={24} /> : <MousePointer2 size={24} />}
         </button>
      </div>

      {/* 화면공유 소스 선택 모달 */}
      {sources.length > 0 && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-auto">
          <div className="bg-zinc-900 rounded-xl p-6 shadow-2xl max-w-2xl w-full">
            <h2 className="text-xl font-bold text-white mb-4">공유할 화면 선택</h2>
            <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
              {sources.map(src => (
                <div 
                  key={src.id} 
                  className="bg-zinc-800 rounded-lg p-2 cursor-pointer hover:ring-2 ring-indigo-500 transition-all flex flex-col"
                  onClick={() => selectSource(src.id)}
                >
                  <img src={src.thumbnail.toDataURL()} alt={src.name} className="w-full h-32 object-contain bg-black/30 rounded mb-2" />
                  <p className="text-sm text-gray-300 truncate text-center">{src.name}</p>
                </div>
              ))}
            </div>
            <button className="mt-6 px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 w-full" onClick={() => setSources([])}>취소</button>
          </div>
        </div>
      )}

      {/* Canvas 오버레이 */}
      <canvas 
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className={`absolute inset-0 w-full h-full z-40 transition-colors duration-200 ${isDrawingMode ? 'pointer-events-auto cursor-crosshair bg-black/5' : 'pointer-events-none'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
      />
    </div>
  );
}

export default App;
