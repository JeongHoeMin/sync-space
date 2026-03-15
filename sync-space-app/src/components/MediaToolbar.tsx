import { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MousePointer2, PenTool, LogOut, Eye, EyeOff } from 'lucide-react';
import { Room } from 'livekit-client';

interface MediaToolbarProps {
  room: Room | null;
  isConnected: boolean;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  isScreenSharing: boolean;
  onToggleShareScreen: () => void;
  onLeaveRoom: () => void;
  isGridVisible: boolean;
  onToggleGrid: () => void;
  isSpeaking?: boolean;
}

export default function MediaToolbar({
  room, isConnected, isDrawingMode, onToggleDrawingMode,
  isScreenSharing, onToggleShareScreen, onLeaveRoom, isGridVisible, onToggleGrid,
  isSpeaking = false,
}: MediaToolbarProps) {
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleMic = async () => {
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    } catch (e) {
      console.error(e);
      showToast('마이크 권한을 허용해주세요.');
    }
  };

  const toggleVideo = async () => {
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (e) {
      console.error(e);
      showToast('카메라 권한을 허용해주세요.');
    }
  };

  return (
    <>
      {/* 권한 토스트 */}
      {toastMessage && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-[70] backdrop-blur-sm whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* 중앙 플로팅 툴바 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl pointer-events-auto z-[65] flex items-center gap-4 border border-zinc-800">
        {!isConnected ? (
          <div className="text-zinc-400 text-sm px-4 py-2">채널에 먼저 접속해주세요</div>
        ) : (
          <>
            {/* 카메라 패널 + 오디오/비디오 컨트롤 */}
            <div className="flex items-center gap-2 pr-4 border-r border-zinc-700">
              {/* 카메라 패널 숨기기/보이기 스위치 (마이크 왼쪽) */}
              <button
                className={`p-3 rounded-xl transition-all duration-200 ${isGridVisible ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700'}`}
                onClick={onToggleGrid}
                title={isGridVisible ? '카메라 패널 숨기기' : '카메라 패널 보이기'}
              >
                {isGridVisible ? <Eye size={24} /> : <EyeOff size={24} />}
              </button>

              <button
                className={`p-3 rounded-xl transition-all duration-200 ${
                  !isMicEnabled ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 
                  isSpeaking ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 
                  'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
                onClick={toggleMic}
                title="마이크 켜기/끄기"
              >
                {isMicEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>

              <button
                className={`p-3 rounded-xl transition-all duration-200 ${isVideoEnabled ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
                onClick={toggleVideo}
                title="카메라 켜기/끄기"
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            </div>

            {/* 화면 공유 및 판서 */}
            <div className="flex items-center gap-2 pr-4 border-r border-zinc-700">
              <button
                className={`p-3 rounded-xl transition-colors duration-200 ${isScreenSharing ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                onClick={onToggleShareScreen}
                title={isScreenSharing ? "화면 공유 중단" : "화면 공유 시작"}
              >
                {isScreenSharing ? <MonitorUp size={24} className="text-white" /> : <MonitorUp size={24} className="text-zinc-400" />}
              </button>

              <button
                className={`p-3 rounded-xl transition-colors duration-200 ${isDrawingMode ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'}`}
                onClick={onToggleDrawingMode}
                title="판서 모드 스위치"
              >
                {isDrawingMode ? <PenTool size={24} /> : <MousePointer2 size={24} />}
              </button>
            </div>

            {/* 나가기 */}
            <button
              className="p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl transition-colors shrink-0"
              onClick={onLeaveRoom}
              title="채널 나가기"
            >
              <LogOut size={24} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
