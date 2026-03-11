import React from 'react';
import { Eraser, Trash2, Pen } from 'lucide-react';

interface DrawingToolbarProps {
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  isEraser: boolean;
  setIsEraser: (isEraser: boolean) => void;
  onClear: () => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#000000', '#ffffff'];
const SIZES = [2, 4, 8, 16];

export default function DrawingToolbar({
  color, setColor, size, setSize, isEraser, setIsEraser, onClear
}: DrawingToolbarProps) {
  return (
    <div className="flex flex-col gap-4 bg-zinc-900/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl pointer-events-auto border border-zinc-700 w-16 items-center z-50">
      
      {/* 펜 / 지우개 모드 토글 */}
      <div className="flex flex-col gap-2 border-b border-zinc-700 pb-3 w-full items-center">
        <button 
          onClick={() => setIsEraser(false)}
          className={`p-2 rounded-xl transition-colors ${!isEraser ? 'bg-indigo-500 text-white shadow-inner' : 'text-zinc-400 hover:bg-zinc-800'}`}
          title="펜"
        >
          <Pen size={20} />
        </button>
        <button 
          onClick={() => setIsEraser(true)}
          className={`p-2 rounded-xl transition-colors ${isEraser ? 'bg-indigo-500 text-white shadow-inner' : 'text-zinc-400 hover:bg-zinc-800'}`}
          title="지우개"
        >
          <Eraser size={20} />
        </button>
      </div>

      {/* 색상 선택 */}
      {!isEraser && (
        <div className="flex flex-col gap-2 border-b border-zinc-700 pb-3 w-full items-center">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform shadow-sm ${color === c ? 'scale-125 border-gray-300' : 'border-zinc-800 scale-100 hover:scale-110'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}

      {/* 굵기 선택 */}
      <div className="flex flex-col gap-3 border-b border-zinc-700 pb-3 w-full items-center">
         {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center ${size === s ? 'bg-zinc-700 ring-1 ring-zinc-500' : 'hover:bg-zinc-800'}`}
              title={`${s}px`}
            >
              <div 
                className={isEraser ? "bg-white/80 rounded-full" : "rounded-full"} 
                style={{ width: s, height: s, backgroundColor: isEraser ? '' : color }}
              ></div>
            </button>
         ))}
      </div>

      {/* 전체 지우기 */}
      <button 
        onClick={onClear}
        className="p-2 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-colors"
        title="전체 캔버스 초기화"
      >
        <Trash2 size={20} />
      </button>

    </div>
  );
}
