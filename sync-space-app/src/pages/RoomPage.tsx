import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MonitorUp, PenTool, MousePointer2, LogOut } from 'lucide-react';
import { Room, RoomEvent, RemoteParticipant, LocalVideoTrack, Track } from 'livekit-client';
import ScreenShareModal from '../components/ScreenShareModal';
import DrawingCanvas, { DrawingCanvasRef, DrawData } from '../components/DrawingCanvas';

declare global {
  interface Window {
    electronAPI: {
      setIgnoreMouseEvents: (ignore: boolean) => void;
      getDesktopSources: () => Promise<any[]>;
      onMessage: (callback: (msg: string) => void) => void;
    };
  }
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
  
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [, setRemoteTracks] = useState<Track[]>([]);

  const WS_URL = 'ws://localhost:7880'; 

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(!isDrawingMode);
    }
  }, [isDrawingMode]);

  const joinRoom = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const res = await fetch('http://localhost:3000/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channelId: id })
      });
      
      const data = await res.json();
      if (!data.token) return alert('토큰 발급 실패: 로그인이 필요할 수 있습니다.');

      const newRoom = new Room();
      
      newRoom
        .on(RoomEvent.TrackSubscribed, (track: Track) => {
          setRemoteTracks(prev => [...prev, track]);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          setRemoteTracks(prev => prev.filter(t => t.sid !== track.sid));
        })
        .on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          const decoder = new TextDecoder();
          try {
            const data: DrawData = JSON.parse(decoder.decode(payload));
            drawingCanvasRef.current?.drawFromRemote(data);
          } catch(e) {
          }
        });

      await newRoom.connect(WS_URL, data.token);
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
    navigate('/dashboard');
  };

  const broadcastDrawData = (data: DrawData) => {
    if (!room || !isConnected) return;
    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(data));
    try {
      room.localParticipant.publishData(payload, { reliable: false });
    } catch (e) {
      console.error(e);
    }
  };



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
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

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
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain -z-10" />

      <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl shadow-2xl pointer-events-auto z-50 flex items-center gap-4">
        {!isConnected ? (
           <button onClick={joinRoom} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded">
             채널 접속 (ID: {id})
           </button>
        ) : (
           <div className="flex items-center gap-4">
             <span className="text-green-400 font-bold whitespace-nowrap">연결됨</span>
             <button onClick={leaveRoom} className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full" title="나가기">
               <LogOut size={20} />
             </button>
           </div>
        )}
      </div>

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

      <ScreenShareModal 
        sources={sources} 
        onSelect={selectSource} 
        onCancel={() => setSources([])} 
      />

      <DrawingCanvas 
        ref={drawingCanvasRef}
        isDrawingMode={isDrawingMode}
        onDraw={broadcastDrawData}
      />
    </div>
  );
}
