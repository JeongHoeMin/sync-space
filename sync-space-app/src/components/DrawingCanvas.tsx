import React, { useRef, useImperativeHandle, forwardRef } from 'react';

export interface DrawData {
  type: 'start' | 'draw' | 'end';
  x: number;
  y: number;
  color: string;
  size: number;
}

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
  onDraw: (data: DrawData) => void;
}

export interface DrawingCanvasRef {
  drawFromRemote: (data: DrawData) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ isDrawingMode, onDraw }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    drawFromRemote: (data: DrawData) => {
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
    }
  }));

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX, e.clientY);
      onDraw({ type: 'start', x: e.clientX, y: e.clientY, color: '#ef4444', size: 3 });
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
      onDraw({ type: 'draw', x: e.clientX, y: e.clientY, color: '#ef4444', size: 3 });
    }
  };

  return (
    <canvas 
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      className={`absolute inset-0 w-full h-full z-40 transition-colors duration-200 ${isDrawingMode ? 'pointer-events-auto cursor-crosshair bg-black/5' : 'pointer-events-none'}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
    />
  );
});

export default DrawingCanvas;
