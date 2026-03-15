import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquare, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Room, RoomEvent, LocalVideoTrack, Track, Participant, VideoTrack, ParticipantEvent } from 'livekit-client';
import ScreenShareModal from '../components/ScreenShareModal';
import DrawingCanvas, { DrawingCanvasRef, DrawData } from '../components/DrawingCanvas';
import ChatPanel from '../components/ChatPanel';
import DrawingToolbar from '../components/DrawingToolbar';
import MediaToolbar from '../components/MediaToolbar';
import VideoGrid from '../components/VideoGrid';
import { useForceLogout } from '../hooks/useForceLogout';
import { configService } from '../services/config.service';

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

  useForceLogout(); // 중복 로그인 시 강제 로그아웃

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [sources, setSources] = useState<any[]>([]);

  const [color, setColor] = useState('#ef4444');
  const [size, setSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  // Undo/Redo 버튼 활성화 상태
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 카메라 패널 가시성
  const [isGridVisible, setIsGridVisible] = useState(true);

  // 채팅 패널 가시성 (접기/펼치기)
  const [isChatVisible, setIsChatVisible] = useState(true);

  // 하단 툴바 가시성 및 자동 숨김
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 판서 툴바 가시성 및 자동 숨김
  const [isDrawingToolbarVisible, setIsDrawingToolbarVisible] = useState(true);
  const drawingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로컬 미디어 상태 (StatusOverlay 동기화용)
  const [, setLocalMediaUpdate] = useState(0);

  // 로컬 참가자 발화 상태
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // 클릭하여 확대할 참가자
  const [expandedParticipant, setExpandedParticipant] = useState<Participant | null>(null);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [, setRemoteTracks] = useState<Track[]>([]);
  const [remoteScreenShareTrack, setRemoteScreenShareTrack] = useState<Track | null>(null);
  const [localScreenShareTrack, setLocalScreenShareTrack] = useState<LocalVideoTrack | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 확대된 참가자 카메라 트랙 연결
  useEffect(() => {
    if (!expandedParticipant || !expandedVideoRef.current) return;
    const videoTrack = Array.from(expandedParticipant.videoTrackPublications.values())
      .find(pub => pub.track?.source === Track.Source.Camera)?.track as VideoTrack | undefined;
    if (videoTrack && expandedVideoRef.current) {
      videoTrack.attach(expandedVideoRef.current);
      return () => { if (expandedVideoRef.current) videoTrack.detach(expandedVideoRef.current); };
    }
  }, [expandedParticipant]);

  const joinRoom = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const res = await fetch(`${configService.getApiUrl()}/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channelId: id })
      });
      
      const data = await res.json();
      console.log('[DEBUG] Token response received:', data ? 'Success' : 'Failed');
      
      if (!data.token) {
        console.error('[CRITICAL] Token is missing in backend response:', data);
        setErrorMessage('백엔드에서 토큰을 받지 못했습니다.');
        return;
      }

      console.log('[DEBUG] Initializing LiveKit Room object...');
      const newRoom = new Room({
        publishDefaults: {
          simulcast: false,
        }
      });

      console.log('[DEBUG] Attempting Signaling Connection to:', configService.getLiveKitUrl());
      console.log('[DEBUG] Token length:', data.token.length);
      
      newRoom
        .on(RoomEvent.TrackSubscribed, (track: Track) => {
          setRemoteTracks(prev => [...prev, track]);
          if (track.source === Track.Source.ScreenShare && track.kind === 'video') {
            setRemoteScreenShareTrack(track);
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          setRemoteTracks(prev => prev.filter(t => t.sid !== track.sid));
          if (track.source === Track.Source.ScreenShare) {
            setRemoteScreenShareTrack(null);
          }
        })
        .on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          const decoder = new TextDecoder();
          try {
            const data: DrawData = JSON.parse(decoder.decode(payload));
            if (data.type === 'clear' && (data as any).clearType === 'mine') {
              drawingCanvasRef.current?.clearDrawingsByUserId(data.userId);
            } else {
              drawingCanvasRef.current?.drawFromRemote(data);
            }
          } catch(e) {
          }
        });

      console.time('[DIAGNOSTIC] LK_CONNECT');
      await newRoom.connect(configService.getLiveKitUrl(), data.token);
      console.log('[DEBUG] LiveKit Connection Established Successfully!');
      console.timeEnd('[DIAGNOSTIC] LK_CONNECT');

      // 마이크 활성화 시도 (없을 경우에도 접속은 유지되도록 처리)
      try {
        await newRoom.localParticipant.setMicrophoneEnabled(true);
      } catch (mediaErr) {
        console.warn('[NOTICE] Could not publish microphone track (Device not found or Permission denied):', mediaErr);
      }
      
      setRoom(newRoom);
      setIsConnected(true);

      // [버그 수정] 초대 입장 시 마이크/카메라가 켜진 상태로 인식되는 경우를 방지하기 위해 명시적 초기화
      await newRoom.localParticipant.setMicrophoneEnabled(false);
      await newRoom.localParticipant.setCameraEnabled(false);
      setLocalMediaUpdate(v => v + 1);
      
      setErrorMessage(null);
      
    } catch (e: any) {
      console.error('[CRITICAL] Detailed Connect Error:', {
        message: e.message,
        name: e.name,
        code: e.code,
        url: configService.getLiveKitUrl()
      });
      
      const errorMsg = e.message || '알 수 없는 연결 에러';
      setErrorMessage(errorMsg);
      
      // 즉시 추가 진단 실행
      console.log('[DIAGNOSTIC] Running network health check...');
      try {
        const pingLK = await fetch(configService.getLiveKitUrl().replace('ws://', 'http://').replace('wss://', 'https://')).then(() => 'Reachable').catch(err => `Unreachable: ${err.message}`);
        console.warn('[DIAGNOSTIC] HTTP Ping to LiveKit:', pingLK);
        
        const pingBE = await fetch(`${configService.getApiUrl()}/health`).then(() => 'Reachable').catch(err => `Unreachable: ${err.message}`);
        console.warn('[DIAGNOSTIC] HTTP Ping to Backend:', pingBE);
        
        alert(`접속 실패 상세 진단:\n1. 에러: ${errorMessage || errorMsg}\n2. LiveKit 서버 상태: ${pingLK}\n3. 백엔드 서버 상태: ${pingBE}\n\n* 개발자 도구(Console)에서 더 자세한 로그를 확인하세요.`);
      } catch (diagErr) {
        alert('방 접속 실패: ' + (errorMessage || errorMsg));
      }
    }
  };

  // 판서 이력 로드
  useEffect(() => {
    if (isConnected && id) {
      const fetchDrawingHistory = async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${configService.getApiUrl()}/channels/${id}/drawings`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const history = await res.json();
          if (Array.isArray(history) && history.length > 0) {
            drawingCanvasRef.current?.setHistory(history);
          }
        } catch (e) {
          console.error('Failed to fetch drawing history:', e);
        }
      };
      fetchDrawingHistory();
    }
  }, [isConnected, id]);

  // 판서 데이터 저장 (Debounced)
  const saveDrawingHistory = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSaveHistory = () => {
    if (saveDrawingHistory.current) clearTimeout(saveDrawingHistory.current);
    saveDrawingHistory.current = setTimeout(async () => {
      const history = drawingCanvasRef.current?.getHistory();
      if (!history || !id) return;
      
      const token = localStorage.getItem('token');
      try {
        await fetch(`${configService.getApiUrl()}/channels/${id}/drawings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ history })
        });
      } catch (e) {
        console.error('Failed to save drawing history:', e);
      }
    }, 2000); // 2초 디바운스
  };

  const handleClearAll = () => {
    broadcastDrawData({ 
      type: 'clear', 
      x: 0, 
      y: 0, 
      color: '', 
      size: 0, 
      isEraser: false,
      userId: room?.localParticipant.identity || ''
    });
    drawingCanvasRef.current?.clearLocalCanvas();
    triggerSaveHistory();
  };

  const handleClearMine = () => {
    const myId = room?.localParticipant.identity || '';
    if (!myId) return;

    // 다른 참가자에게 clearMine 브로드캐스트
    broadcastDrawData({ 
      type: 'clear', 
      x: 0, y: 0, color: '', size: 0, isEraser: false,
      userId: myId,
      clearType: 'mine'
    } as any);

    // 로컬: undo 지원 내 판서 지우기 (undoStack에 clearMine 엔트리 저장)
    drawingCanvasRef.current?.clearMyDrawingsWithUndo();
    triggerSaveHistory();
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
      if (data.type !== 'clear') {
        triggerSaveHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };



  const handleToggleShareScreen = async () => {
    if (localScreenShareTrack) {
      // 이미 화면 공유 중일 경우 -> 공유 중단
      if (room) {
        await room.localParticipant.unpublishTrack(localScreenShareTrack, true);
      }
      localScreenShareTrack.stop();
      setLocalScreenShareTrack(null);
      if (videoRef.current && !remoteScreenShareTrack) {
         videoRef.current.srcObject = null;
      }
      return;
    }

    // 공유 중이 아닌 경우 -> 모달 띄우기
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
      
      const videoTrack = stream.getVideoTracks()[0];

      if (videoRef.current) {
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();
      }

      if (room && isConnected) {
        const publishedTrack = new LocalVideoTrack(videoTrack);
        await room.localParticipant.publishTrack(publishedTrack, { 
          name: 'screen-share',
          source: Track.Source.ScreenShare 
        });
        setLocalScreenShareTrack(publishedTrack);
      }

      setSources([]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // 상대방의 화면 공유 트랙을 수신한 경우, 메인 비디오 요소에 연결
    if (remoteScreenShareTrack && videoRef.current) {
      remoteScreenShareTrack.attach(videoRef.current);
    } else if (!remoteScreenShareTrack && videoRef.current && !room?.localParticipant.isScreenShareEnabled) {
      // 내 화면 공유 트랙도 없는 상태라면 초기화
      videoRef.current.srcObject = null;
    }

    return () => {
      if (remoteScreenShareTrack && videoRef.current) {
        remoteScreenShareTrack.detach(videoRef.current);
      }
    };
  }, [remoteScreenShareTrack, room]);

  // 로컬 참가자 미디어 및 발화 상태 변화 감지 (툴바 숨김 시 오버레이 동기화)
  useEffect(() => {
    if (!room) return;
    const handleUpdate = () => setLocalMediaUpdate(v => v + 1);
    const handleSpeaking = () => setIsLocalSpeaking(room.localParticipant.isSpeaking);
    
    room.localParticipant.on(ParticipantEvent.TrackMuted, handleUpdate);
    room.localParticipant.on(ParticipantEvent.TrackUnmuted, handleUpdate);
    room.localParticipant.on(ParticipantEvent.LocalTrackPublished, handleUpdate);
    room.localParticipant.on(ParticipantEvent.LocalTrackUnpublished, handleUpdate);
    room.localParticipant.on(ParticipantEvent.IsSpeakingChanged, handleSpeaking);

    return () => {
      room.localParticipant.off(ParticipantEvent.TrackMuted, handleUpdate);
      room.localParticipant.off(ParticipantEvent.TrackUnmuted, handleUpdate);
      room.localParticipant.off(ParticipantEvent.LocalTrackPublished, handleUpdate);
      room.localParticipant.off(ParticipantEvent.LocalTrackUnpublished, handleUpdate);
      room.localParticipant.off(ParticipantEvent.IsSpeakingChanged, handleSpeaking);
    };
  }, [room]);

  // 하단 툴바 숨김 타이머 시작 함수
  const startHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
      hideTimeoutRef.current = null;
    }, 800); // 0.8초로 변경
  };

  // 하단 툴바 숨김 타이머 취소 함수 (추가: 센서 바 호버 시 기존 타이머 제거 목적)
  const clearHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // 판서 툴바 숨김 타이머 시작 함수
  const startDrawingHideTimer = () => {
    if (drawingHideTimeoutRef.current) clearTimeout(drawingHideTimeoutRef.current);
    drawingHideTimeoutRef.current = setTimeout(() => {
      setIsDrawingToolbarVisible(false);
      drawingHideTimeoutRef.current = null;
    }, 800); // 0.8초 동일 적용
  };

  // 판서 툴바 숨김 타이머 취소 함수
  const clearDrawingHideTimer = () => {
    if (drawingHideTimeoutRef.current) {
      clearTimeout(drawingHideTimeoutRef.current);
      drawingHideTimeoutRef.current = null;
    }
  };

  return (
    <div className="w-screen h-screen bg-zinc-950 overflow-hidden flex select-none" style={{ WebkitAppRegion: 'drag' } as any}>


      {/* 좌측: 메인 화상/판서 영역 */}
      <div className="flex-1 relative h-full">
      {/* 윈도우 드래그 및 상단 바 (Layer: 최상단) */}
      <div className="absolute top-0 left-0 w-full h-14 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-4 z-[100] border-b border-zinc-800/50" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* 뒤로 가기 (나가기) 버튼: 헤더 영역 내부에 배치하여 가려짐 방지 */}
          <button 
            onClick={leaveRoom} 
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-inner"
            title="방 나가기"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-tight">SyncSpace Room</span>
            <span className="text-sm text-zinc-200 font-semibold max-w-[200px] truncate leading-tight">{id}</span>
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-500 font-bold uppercase">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* 최하단 Layer 1: 화면 공유 배경 */}
      <video 
        ref={videoRef} 
        className="absolute inset-0 w-full h-full object-contain z-0" 
      />
      
      {/* 우측 상단 플로팅 VideoGrid 컴포넌트 */}
      {isConnected && (
        <div 
          className="absolute right-4 top-16 z-[40]"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <VideoGrid
            room={room}
            isVisible={isGridVisible}
            onParticipantClick={(p) => setExpandedParticipant(p)}
          />
        </div>
      )}

      {/* 참가자 카메라 확대 오버레이 (공유 화면 대신 표시) */}
      {expandedParticipant && (
        <div className="absolute inset-0 z-[45] bg-zinc-950 flex items-center justify-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <video
            ref={expandedVideoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted
          />
          {/* 이름 표시 */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur rounded-full text-white text-sm font-medium">
            {expandedParticipant.identity.split('@')[0]}
          </div>
          {/* 공유 화면으로 돌아가기 버튼 */}
          <button
            onClick={() => setExpandedParticipant(null)}
            className="absolute top-20 left-4 flex items-center gap-2 px-4 py-2 bg-zinc-800/90 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl border border-zinc-700 transition-colors shadow-lg"
          >
            <ChevronLeft size={18} />
            공유 화면으로 돌아가기
          </button>
        </div>
      )}

      {/* 접속 전 중앙 안내 UI */}
      {!isConnected && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div 
              className="bg-zinc-900/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-zinc-800/50 pointer-events-auto flex flex-col items-center gap-6 max-w-md w-full mx-4"
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-500">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10">
                   <path d="M15 10l5 5-5 5M4 4v7a4 0 004 4h12" />
                 </svg>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">화상 채널 입장</h2>
                <p className="text-zinc-400 text-sm">팀원들과 실시간으로 소통하고<br/>화면 위에 직접 아이디어를 그려보세요.</p>
              </div>
              <button 
                onClick={joinRoom} 
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-black text-lg rounded-2xl shadow-lg shadow-indigo-500/20 transition-all duration-200"
              >
                채널 접속하기
              </button>
            </div>
         </div>
      )}

      {/* 판서 툴바: 좌측 센서 연동 및 상시 2열 배치 */}
      {isDrawingMode && !expandedParticipant && (
        <>
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-500 ease-in-out ${isDrawingToolbarVisible ? 'translate-x-6' : '-translate-x-full'}`}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseEnter={clearDrawingHideTimer}
            onMouseLeave={startDrawingHideTimer}
          >
            <DrawingToolbar
              color={color}
              setColor={setColor}
              size={size}
              setSize={setSize}
              isEraser={isEraser}
              setIsEraser={setIsEraser}
              onClearAll={handleClearAll}
              onClearMine={handleClearMine}
              onUndo={() => drawingCanvasRef.current?.undo()}
              onRedo={() => drawingCanvasRef.current?.redo()}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>

          {/* 좌측 판서 센서 바 */}
          {!isDrawingToolbarVisible && (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-32 bg-zinc-300/30 hover:bg-zinc-300/50 cursor-pointer z-[70] transition-colors rounded-r-full"
              style={{ WebkitAppRegion: 'no-drag' } as any}
              onMouseEnter={() => setIsDrawingToolbarVisible(true)}
            />
          )}
        </>
      )}

      {/* 중앙 하단 플로팅 툴바 및 센서: 접속 시에만 노출 */}
      {isConnected && id && (
        <>
          <div 
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-[65] transition-transform duration-500 ease-in-out ${isToolbarVisible ? 'translate-y-0' : 'translate-y-24'}`}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseEnter={clearHideTimer}
            onMouseLeave={startHideTimer}
          >
            <MediaToolbar
              room={room}
              isConnected={isConnected}
              isDrawingMode={isDrawingMode}
              onToggleDrawingMode={() => setIsDrawingMode(!isDrawingMode)}
              isScreenSharing={!!localScreenShareTrack}
              onToggleShareScreen={handleToggleShareScreen}
              onLeaveRoom={leaveRoom}
              isGridVisible={isGridVisible}
              onToggleGrid={() => setIsGridVisible(v => !v)}
              isSpeaking={isLocalSpeaking}
            />
          </div>

          {/* 하단 센서 바: 100px 고정 너비 및 연한 회색 적용 */}
          {!isToolbarVisible && (
            <div 
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[100px] h-1.5 bg-zinc-300/30 hover:bg-zinc-300/50 cursor-pointer z-[70] transition-colors rounded-t-full"
              style={{ WebkitAppRegion: 'no-drag' } as any}
              onMouseEnter={() => setIsToolbarVisible(true)}
            />
          )}
        </>
      )}

      {/* 우하단 상태 오버레이 (툴바가 숨겨졌을 때만 표시) */}
      {!isToolbarVisible && isConnected && room && (
        <div className="absolute bottom-6 right-6 z-[60] flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-zinc-800 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
            !room.localParticipant.isMicrophoneEnabled ? 'text-red-500 bg-red-500/10' : 
            isLocalSpeaking ? 'text-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'text-zinc-400'
          }`}>
            {room.localParticipant.isMicrophoneEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          </div>
          <div className={`p-1.5 rounded-lg ${room.localParticipant.isCameraEnabled ? 'text-zinc-400' : 'text-red-500 bg-red-500/10'}`}>
            {room.localParticipant.isCameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
          </div>
        </div>
      )}

      <ScreenShareModal 
        sources={sources} 
        onSelect={selectSource} 
        onCancel={() => setSources([])} 
      />
      {/* DrawingCanvas: z-[30]으로 설정하여 비디오 패널(z-[40]) 등 UI 아래에 위치하게 함 */}
      <div className="absolute inset-0 z-[30]" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <DrawingCanvas
          ref={drawingCanvasRef}
          isDrawingMode={isDrawingMode && !expandedParticipant}
          color={color}
          size={size}
          isEraser={isEraser}
          onDraw={broadcastDrawData}
          videoElement={videoRef.current}
          userId={room?.localParticipant.identity || ''}
          onStackChange={(canU, canR) => { setCanUndo(canU); setCanRedo(canR); }}
        />
      </div>

      </div> {/* 메인 영역 끝 */}

      {/* 우측: 채팅 영역 (보일 때만) */}
      {isConnected && id && (
        <div 
          className={`h-full flex-shrink-0 border-l border-zinc-800 shadow-xl pointer-events-auto z-[50] relative transition-all duration-300 flex flex-col ${isChatVisible ? 'w-[360px] bg-zinc-950/90' : 'w-12 bg-zinc-900 border-none'}`}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {/* 채팅 헤더 및 토글 버튼 (OS 창 닫기 버튼과 겹침 방지를 위해 텍스트 좌측에 배치) */}
          <div className={`h-14 border-b border-zinc-800/50 flex items-center shrink-0 bg-zinc-900/50 ${isChatVisible ? 'justify-start px-4 gap-3' : 'justify-center px-2'}`}>
            <button
               onClick={() => setIsChatVisible(!isChatVisible)}
               className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors flex-shrink-0 z-[100]"
               title={isChatVisible ? "채팅 접기" : "채팅 펼치기"}
            >
               {isChatVisible ? <ChevronRight size={18} /> : <MessageSquare size={18} />}
            </button>
            {isChatVisible && <span className="font-semibold text-zinc-300 text-sm whitespace-nowrap">라이브 채팅</span>}
          </div>

          {/* 채팅 컨텐츠 영역 - 텍스트 선택 가능하도록 select-text 적용 */}
          <div className={`flex-1 overflow-hidden transition-opacity duration-300 select-text ${isChatVisible ? 'opacity-100' : 'opacity-0 hidden'}`}>
            <ChatPanel channelId={id} />
          </div>
        </div>
      )}
    </div>
  );
}
