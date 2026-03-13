import { Eraser, Trash2, Pen, Undo2, Redo2 } from 'lucide-react';

interface DrawingToolbarProps {
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  isEraser: boolean;
  setIsEraser: (isEraser: boolean) => void;
  onClearAll: () => void;
  onClearMine: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#000000', '#ffffff'];
const SIZES = [2, 4, 8, 16];

export default function DrawingToolbar({
  color, setColor, size, setSize, isEraser, setIsEraser,
  onClearAll, onClearMine, onUndo, onRedo, canUndo, canRedo,
}: DrawingToolbarProps) {
  // 사용자의 요청에 따라 화면 크기 조건 없이 항상 2열 적용
  return (
    <div className="flex flex-col w-[100px] gap-4 bg-zinc-900/95 backdrop-blur-md p-3 rounded-3xl shadow-2xl pointer-events-auto border border-zinc-700/50 items-center z-50 transition-all duration-300">
      
      {/* 펜 / 지우개 토글 - 상시 2열 */}
      <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 pb-3 w-full justify-items-center">
        <button
          onClick={() => setIsEraser(false)}
          className={`p-2 rounded-xl transition-all ${!isEraser ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
          title="펜 도구"
        >
          <Pen size={20} />
        </button>
        <button
          onClick={() => setIsEraser(true)}
          className={`p-2 rounded-xl transition-all ${isEraser ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
          title="지우개 도구 (내 판서)"
        >
          <Eraser size={20} />
        </button>
      </div>

      {/* 색상 선택 - 상시 2열 */}
      {!isEraser && (
        <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 pb-3 w-full justify-items-center">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform shadow-sm ${color === c ? 'scale-125 border-white shadow-md' : 'border-black/20 scale-100 hover:scale-110'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}

      {/* 굵기 선택 - 상시 2열 */}
      <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 pb-3 w-full justify-items-center">
        {SIZES.map(s => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${size === s ? 'bg-zinc-800 ring-1 ring-zinc-600 shadow-inner' : 'hover:bg-zinc-800/50'}`}
            title={`${s}px`}
          >
            <div
              className={`rounded-full ${isEraser ? 'bg-white/80' : ''}`}
              style={{ 
                width: Math.min(s, 14), 
                height: Math.min(s, 14), 
                backgroundColor: isEraser ? '' : color 
              }}
            />
          </button>
        ))}
      </div>

      {/* 되돌리기 / 다시실행 - 상시 2열 */}
      <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 pb-3 w-full justify-items-center">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-xl transition-colors flex flex-col items-center ${canUndo ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700 cursor-not-allowed opacity-30'}`}
          title="되돌리기 (Undo)"
        >
          <Undo2 size={18} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Undo</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-xl transition-colors flex flex-col items-center ${canRedo ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700 cursor-not-allowed opacity-30'}`}
          title="다시실행 (Redo)"
        >
          <Redo2 size={18} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Redo</span>
        </button>
      </div>

      {/* 초기화 (내 판서 / 전체) - 상시 2열 */}
      <div className="grid grid-cols-2 gap-2 w-full justify-items-center pt-1">
        <button
          onClick={onClearMine}
          className="p-2 text-orange-500/80 hover:bg-orange-500/10 hover:text-orange-400 rounded-xl transition-colors flex flex-col items-center"
          title="내 판서 초기화"
        >
          <Eraser size={18} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Mine</span>
        </button>
        <button
          onClick={onClearAll}
          className="p-2 text-red-500/80 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors flex flex-col items-center"
          title="모든 판서 초기화"
        >
          <Trash2 size={18} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-tighter">All</span>
        </button>
      </div>
    </div>
  );
}
