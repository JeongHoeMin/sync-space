import React, { useRef, useImperativeHandle, forwardRef } from 'react';

export interface DrawData {
  type: 'start' | 'draw' | 'end' | 'clear';
  x: number;
  y: number;
  color: string;
  size: number;
  isEraser: boolean;
}

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
  color: string;
  size: number;
  isEraser: boolean;
  onDraw: (data: DrawData) => void;
}

export interface DrawingCanvasRef {
  drawFromRemote: (data: DrawData) => void;
  clearLocalCanvas: () => void;
}


const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ isDrawingMode, color, size, isEraser, onDraw }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRafRef = useRef<number | null>(null);
  const lastEmitTimeRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    drawFromRemote: (data: DrawData) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;
      
      if (data.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.globalCompositeOperation = data.isEraser ? 'destination-out' : 'source-over';
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (data.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      } else if (data.type === 'draw') {
        ctx.lineTo(data.x, data.y);
        if (!data.isEraser) ctx.strokeStyle = data.color;
        ctx.stroke();
      }
    },
    clearLocalCanvas: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }));

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(e.clientX, e.clientY);
      onDraw({ type: 'start', x: e.clientX, y: e.clientY, color, size, isEraser });
      lastEmitTimeRef.current = Date.now();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 || !isDrawingMode) return;
    
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (drawRafRef.current === null) {
      drawRafRef.current = requestAnimationFrame(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
          ctx.lineTo(clientX, clientY);
          if (!isEraser) ctx.strokeStyle = color;
          ctx.lineWidth = size;
          ctx.stroke();

          const now = Date.now();
          if (now - lastEmitTimeRef.current >= 30) {
            onDraw({ type: 'draw', x: clientX, y: clientY, color, size, isEraser });
            lastEmitTimeRef.current = now;
          }
        }
        drawRafRef.current = null;
      });
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
