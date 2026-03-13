
export interface ScreenShareModalProps {
  sources: any[];
  onSelect: (sourceId: string) => void;
  onCancel: () => void;
}

export default function ScreenShareModal({ sources, onSelect, onCancel }: ScreenShareModalProps) {
  if (sources.length === 0) return null;

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-auto">
      <div className="bg-zinc-900 rounded-xl p-6 shadow-2xl max-w-2xl w-full">
        <h2 className="text-xl font-bold text-white mb-4">공유할 화면 선택</h2>
        <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
          {sources.map(src => (
            <div 
              key={src.id} 
              className="bg-zinc-800 rounded-lg p-2 cursor-pointer hover:ring-2 ring-indigo-500 transition-all flex flex-col"
              onClick={() => onSelect(src.id)}
            >
              <img src={src.thumbnail} alt={src.name} className="w-full h-32 object-contain bg-black/30 rounded mb-2" />
              <p className="text-sm text-gray-300 truncate text-center">{src.name}</p>
            </div>
          ))}
        </div>
        <button className="mt-6 px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 w-full" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}
