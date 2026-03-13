import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Participant, Track, VideoTrack } from 'livekit-client';
import { User, MicOff } from 'lucide-react';

interface VideoGridProps {
  room: Room | null;
  isVisible: boolean;
  onParticipantClick: (participant: Participant) => void;
}

export default function VideoGrid({ room, isVisible, onParticipantClick }: VideoGridProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<Participant[]>([]);

  useEffect(() => {
    if (!room) { setParticipants([]); return; }

    const updateParticipants = () => {
      const allParticipants: Participant[] = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values()),
      ];
      setParticipants(allParticipants);
    };

    updateParticipants();
    room
      .on(RoomEvent.ParticipantConnected, updateParticipants)
      .on(RoomEvent.ParticipantDisconnected, updateParticipants)
      .on(RoomEvent.TrackSubscribed, updateParticipants)
      .on(RoomEvent.TrackUnsubscribed, updateParticipants)
      .on(RoomEvent.LocalTrackPublished, updateParticipants)
      .on(RoomEvent.LocalTrackUnpublished, updateParticipants)
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        setActiveSpeakers(speakers);
      });

    return () => {};
  }, [room]);

  if (!room || participants.length === 0 || !isVisible) return null;

  const gridCols =
    participants.length === 1 ? 'grid-cols-1' :
    participants.length <= 4 ? 'grid-cols-2' :
    'grid-cols-3';

  return (
    <div className={`pointer-events-auto bg-transparent max-w-xs max-h-[80vh] overflow-y-auto scrollbar-hide p-2 grid gap-2 ${gridCols}`}>
      {participants.map((p) => {
        const isSpeaking = activeSpeakers.some(s => s.sid === p.sid);
        return (
          <ParticipantVideo
            key={p.sid || p.identity}
            participant={p}
            isSpeaking={isSpeaking}
            onClick={() => onParticipantClick(p)}
          />
        );
      })}
    </div>
  );
}

function ParticipantVideo({
  participant, isSpeaking, onClick,
}: {
  participant: Participant;
  isSpeaking: boolean;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoTrack = Array.from(participant.videoTrackPublications.values())
    .find(pub => pub.track?.source === Track.Source.Camera)?.track as VideoTrack | undefined;

  const isAudioMuted = !Array.from(participant.audioTrackPublications.values())
    .some(pub => !pub.isMuted);

  useEffect(() => {
    if (videoRef.current && videoTrack) videoTrack.attach(videoRef.current);
    return () => { if (videoRef.current && videoTrack) videoTrack.detach(videoRef.current); };
  }, [videoTrack]);

  return (
    <div
      className={`relative bg-zinc-800 rounded-xl overflow-hidden aspect-video shadow-lg transition-all duration-200 w-28 md:w-36 border-2 cursor-pointer hover:brightness-110 hover:border-indigo-400 ${
        isSpeaking ? 'border-indigo-500 scale-105' : 'border-zinc-700'
      }`}
      onClick={onClick}
      title="클릭하여 크게 보기"
    >
      {videoTrack ? (
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
          <User size={28} />
        </div>
      )}

      {/* 이름 / 마이크 상태 */}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-2 py-0.5 bg-black/60 backdrop-blur rounded-md">
        <span className="text-white text-[9px] font-medium truncate shrink">
          {participant.identity.split('@')[0]} {participant.isLocal && '(나)'}
        </span>
        {isAudioMuted && <MicOff size={10} className="text-red-400 shrink-0 ml-1" />}
      </div>
    </div>
  );
}
