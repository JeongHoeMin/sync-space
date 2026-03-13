import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

export interface DrawData {
  type: 'start' | 'draw' | 'end' | 'clear' | 'undo';
  x: number;
  y: number;
  color: string;
  size: number;
  isEraser: boolean;
  userId: string;
  strokeId?: string;
}

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
  color: string;
  size: number;
  isEraser: boolean;
  onDraw: (data: DrawData) => void;
  videoElement: HTMLVideoElement | null;
  userId: string;
  onStackChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface DrawingCanvasRef {
  drawFromRemote: (data: DrawData) => void;
  clearLocalCanvas: () => void;
  clearDrawingsByUserId: (userId: string) => void;
  clearMyDrawingsWithUndo: () => void; // 내 판서 지우기 (undo 지원)
  getHistory: () => DrawData[];
  setHistory: (history: DrawData[]) => void;
  undo: () => void;
  redo: () => void;
}

// ─── Undo/Redo 엔트리 타입 ─────────────────────────────────────────────────
interface StrokeEntry {
  kind: 'stroke';
  strokeId: string;
  events: DrawData[];
}

interface ClearMineEntry {
  kind: 'clearMine';
  clearedEvents: DrawData[]; // 지워진 내 판서 이벤트 전체
}

type UndoEntry = StrokeEntry | ClearMineEntry;

// ──────────────────────────────────────────────────────────────────────────────

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  ({ isDrawingMode, color, size, isEraser, onDraw, videoElement, userId, onStackChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawRafRef = useRef<number | null>(null);
    const remoteLastPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const localLastPosRef = useRef<{ x: number; y: number } | null>(null);
    const historyRef = useRef<DrawData[]>([]);
    const lastEmitTimeRef = useRef<number>(0);

    const currentStrokeIdRef = useRef<string>('');
    const currentStrokeEventsRef = useRef<DrawData[]>([]);
    const undoStackRef = useRef<UndoEntry[]>([]);
    const redoStackRef = useRef<UndoEntry[]>([]);
    const remoteEraserRafRef = useRef<number | null>(null);

    // 콜백 ref (stale closure 방지)
    const onDrawRef = useRef(onDraw);
    const onStackChangeRef = useRef(onStackChange);
    useEffect(() => { onDrawRef.current = onDraw; }, [onDraw]);
    useEffect(() => { onStackChangeRef.current = onStackChange; }, [onStackChange]);

    const notifyStackChange = () => {
      onStackChangeRef.current?.(undoStackRef.current.length > 0, redoStackRef.current.length > 0);
    };

    const getContentRect = () => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, w: 1, h: 1 };
      const cw = canvas.width, ch = canvas.height;
      if (!videoElement || !videoElement.videoWidth) return { x: 0, y: 0, w: cw, h: ch };
      const vr = videoElement.videoWidth / videoElement.videoHeight;
      const cr = cw / ch;
      let rw, rh, rx, ry;
      if (vr > cr) { rw = cw; rh = cw / vr; rx = 0; ry = (ch - rh) / 2; }
      else { rh = ch; rw = ch * vr; ry = 0; rx = (cw - rw) / 2; }
      return { x: rx, y: ry, w: rw, h: rh };
    };

    /**
     * 사용자별 OffscreenCanvas 격리 렌더링
     * → 각 사용자의 지우개는 자신의 레이어에만 적용
     */
    const redrawFromHistory = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rect = getContentRect();

      // 마지막 전체 clear 이후만 처리
      let startIdx = 0;
      for (let i = historyRef.current.length - 1; i >= 0; i--) {
        if (historyRef.current[i].type === 'clear') { startIdx = i + 1; break; }
      }
      const effective = historyRef.current.slice(startIdx);
      const userIds = [...new Set(effective.map(d => d.userId).filter(Boolean))];

      for (const uid of userIds) {
        const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
        const offCtx = offscreen.getContext('2d')!;
        const lastPosMap = new Map<string, { x: number; y: number }>();

        for (const data of effective.filter(d => d.userId === uid)) {
          if (data.type === 'undo' || data.type === 'clear') continue;
          const x = rect.x + data.x * rect.w, y = rect.y + data.y * rect.h;
          if (data.type === 'start') { lastPosMap.set(uid, { x, y }); }
          else if (data.type === 'draw') {
            const lp = lastPosMap.get(uid);
            if (lp) {
              offCtx.save();
              offCtx.globalCompositeOperation = data.isEraser ? 'destination-out' : 'source-over';
              offCtx.lineWidth = data.size; offCtx.lineCap = 'round'; offCtx.lineJoin = 'round';
              if (!data.isEraser) offCtx.strokeStyle = data.color;
              offCtx.beginPath(); offCtx.moveTo(lp.x, lp.y); offCtx.lineTo(x, y); offCtx.stroke();
              offCtx.restore();
            }
            lastPosMap.set(uid, { x, y });
          } else if (data.type === 'end') { lastPosMap.delete(uid); }
        }
        ctx.drawImage(offscreen, 0, 0);
      }
    };

    /**
     * 지우개가 실제로 내 판서 픽셀을 지웠는지 OffscreenCanvas 픽셀 비교로 확인
     * 지우개 경로의 바운딩 박스 영역만 비교해 성능 최적화
     */
    const checkEraserEffective = (): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = getContentRect();

      const eraserDrawEvents = currentStrokeEventsRef.current.filter(ev => ev.type === 'draw');
      if (eraserDrawEvents.length === 0) return false;

      // 지우개 경로의 바운딩 박스 계산
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const halfSize = (currentStrokeEventsRef.current[0]?.size ?? size) / 2;
      for (const ev of eraserDrawEvents) {
        const px = rect.x + ev.x * rect.w, py = rect.y + ev.y * rect.h;
        minX = Math.min(minX, px - halfSize); minY = Math.min(minY, py - halfSize);
        maxX = Math.max(maxX, px + halfSize); maxY = Math.max(maxY, py + halfSize);
      }
      minX = Math.max(0, Math.floor(minX)); minY = Math.max(0, Math.floor(minY));
      maxX = Math.min(canvas.width, Math.ceil(maxX)); maxY = Math.min(canvas.height, Math.ceil(maxY));
      const w = maxX - minX, h = maxY - minY;
      if (w <= 0 || h <= 0) return false;

      // 현재 획 제외한 내 판서 이벤트
      const myDrawnBefore = historyRef.current.filter(
        ev => ev.userId === userId && !ev.isEraser && !currentStrokeEventsRef.current.includes(ev)
      );
      if (myDrawnBefore.length === 0) return false;

      // OffscreenCanvas A: 지워지기 전 내 판서 (바운딩 박스 크기)
      const offA = new OffscreenCanvas(w, h);
      const ctxA = offA.getContext('2d')!;
      ctxA.translate(-minX, -minY);
      const lpmA = new Map<string, { x: number; y: number }>();
      for (const data of historyRef.current.filter(
        ev => ev.userId === userId && !ev.isEraser && !currentStrokeEventsRef.current.includes(ev)
      )) {
        if (data.type === 'undo' || data.type === 'clear') continue;
        const x = rect.x + data.x * rect.w, y = rect.y + data.y * rect.h;
        if (data.type === 'start') { lpmA.set(userId, { x, y }); }
        else if (data.type === 'draw') {
          const lp = lpmA.get(userId);
          if (lp) {
            ctxA.save();
            ctxA.lineWidth = data.size; ctxA.lineCap = 'round'; ctxA.lineJoin = 'round';
            ctxA.strokeStyle = data.color;
            ctxA.beginPath(); ctxA.moveTo(lp.x, lp.y); ctxA.lineTo(x, y); ctxA.stroke();
            ctxA.restore();
          }
          lpmA.set(userId, { x, y });
        } else if (data.type === 'end') { lpmA.delete(userId); }
      }

      // OffscreenCanvas B: A위에 지우개 적용
      const offB = new OffscreenCanvas(w, h);
      const ctxB = offB.getContext('2d')!;
      ctxB.drawImage(offA, 0, 0);
      ctxB.translate(-minX, -minY);
      const lpmB = new Map<string, { x: number; y: number }>();
      for (const data of currentStrokeEventsRef.current) {
        if (data.type === 'undo' || data.type === 'clear') continue;
        const x = rect.x + data.x * rect.w, y = rect.y + data.y * rect.h;
        if (data.type === 'start') { lpmB.set(userId, { x, y }); }
        else if (data.type === 'draw') {
          const lp = lpmB.get(userId);
          if (lp) {
            ctxB.save();
            ctxB.globalCompositeOperation = 'destination-out';
            ctxB.lineWidth = data.size; ctxB.lineCap = 'round'; ctxB.lineJoin = 'round';
            ctxB.beginPath(); ctxB.moveTo(lp.x, lp.y); ctxB.lineTo(x, y); ctxB.stroke();
            ctxB.restore();
          }
          lpmB.set(userId, { x, y });
        } else if (data.type === 'end') { lpmB.delete(userId); }
      }

      // 픽셀 비교: A의 불투명 픽셀이 B에서 더 투명해졌으면 실제로 지운 것
      const dataA = ctxA.getImageData(0, 0, w, h).data;
      const dataB = ctxB.getImageData(0, 0, w, h).data;
      for (let i = 3; i < dataA.length; i += 4) {
        if (dataA[i] > 0 && dataB[i] < dataA[i]) return true;
      }
      return false;
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (!canvas || !parent) return;

      const handleResize = () => {
        // 부모 컨테이너(clientWidth) 기준으로 캔버스 크기를 설정
        if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
          canvas.width = parent.clientWidth; 
          canvas.height = parent.clientHeight;
          redrawFromHistory();
        }
      };

      // ResizeObserver를 사용하여 부모 요소의 실제 크기 변화(채팅 토글 등)를 감지
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });

      resizeObserver.observe(parent);
      
      // 초기 실행
      handleResize();
      
      return () => {
        resizeObserver.disconnect();
      };
    }, [videoElement, isDrawingMode]);

    useImperativeHandle(ref, () => ({
      drawFromRemote: (data: DrawData) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        const uid = data.userId;
        if (!uid) return;

        if (data.type === 'undo') {
          if (data.strokeId) {
            historyRef.current = historyRef.current.filter(e => e.strokeId !== data.strokeId);
            redrawFromHistory();
          }
          return;
        }

        historyRef.current.push(data);

        if (data.type === 'clear') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          remoteLastPosRef.current.clear();
          return;
        }

        // 다른 사용자의 지우개: 격리 보장 위해 RAF 쓰로틀 재렌더
        if (data.isEraser && uid !== userId) {
          if (remoteEraserRafRef.current === null) {
            remoteEraserRafRef.current = requestAnimationFrame(() => {
              redrawFromHistory(); remoteEraserRafRef.current = null;
            });
          }
          return;
        }

        // 일반 원격 이벤트: 직접 즉시 렌더
        const rect = getContentRect();
        const x = rect.x + data.x * rect.w, y = rect.y + data.y * rect.h;
        ctx.save();
        ctx.globalCompositeOperation = data.isEraser ? 'destination-out' : 'source-over';
        ctx.lineWidth = data.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (!data.isEraser) ctx.strokeStyle = data.color;
        if (data.type === 'start') { remoteLastPosRef.current.set(uid, { x, y }); }
        else if (data.type === 'draw') {
          const lp = remoteLastPosRef.current.get(uid);
          if (lp) { ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(x, y); ctx.stroke(); }
          remoteLastPosRef.current.set(uid, { x, y });
        } else if (data.type === 'end') { remoteLastPosRef.current.delete(uid); }
        ctx.restore();
      },

      clearLocalCanvas: () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          remoteLastPosRef.current.clear(); localLastPosRef.current = null;
          historyRef.current = []; undoStackRef.current = []; redoStackRef.current = [];
          notifyStackChange();
        }
      },

      clearDrawingsByUserId: (targetId: string) => {
        // [버그 수정] type==='clear'(전체 지우기) 이벤트는 userId와 무관하게 반드시 보존
        // 제거 시 redrawFromHistory가 clear 분기점을 못 찾아 이전 판서가 다시 렌더링됨
        historyRef.current = historyRef.current.filter(
          item => item.userId !== targetId || item.type === 'clear'
        );
        if (targetId === userId) {
          undoStackRef.current = []; redoStackRef.current = []; notifyStackChange();
        }
        redrawFromHistory();
      },

      /**
       * 내 판서 지우기 (undo 지원 버전)
       * - 현재 내 판서 이벤트를 ClearMineEntry로 undoStack에 저장
       * - undo 시 복원 + 재방송, redo 시 다시 삭제
       */
      clearMyDrawingsWithUndo: () => {
        // [버그 수정] 마지막 전체 clear 이후의 내 이벤트만 복원 대상으로 저장
        // 전체 지우기 이전 판서를 포함하면, undo 시 재방송으로 원격 클라이언트에 되살아남
        let startIdx = 0;
        for (let i = historyRef.current.length - 1; i >= 0; i--) {
          if (historyRef.current[i].type === 'clear') { startIdx = i + 1; break; }
        }
        const effectiveMyEvents = historyRef.current
          .slice(startIdx)
          .filter(ev => ev.userId === userId);

        // undoStack 엔트리: clear 이후 이벤트만 저장 (비어있어도 기록은 남기지 않음)
        if (effectiveMyEvents.length > 0) {
          undoStackRef.current.push({ kind: 'clearMine', clearedEvents: effectiveMyEvents });
        }
        redoStackRef.current = [];

        // 히스토리에서 내 이벤트 전부 제거 (clear 이전 포함, 영구 삭제)
        // [버그 수정] type==='clear' 이벤트는 반드시 보존 (전체 지우기 분기점)
        historyRef.current = historyRef.current.filter(
          ev => ev.userId !== userId || ev.type === 'clear'
        );
        redrawFromHistory();
        notifyStackChange();
      },

      getHistory: () => historyRef.current,
      setHistory: (history: DrawData[]) => {
        historyRef.current = history;
        redrawFromHistory();
      },

      undo: () => {
        const entry = undoStackRef.current.pop();
        if (!entry) return;
        redoStackRef.current.push(entry);

        if (entry.kind === 'stroke') {
          // 획 단위 undo: 해당 획 히스토리 제거 + 다른 사용자에게 브로드캐스트
          historyRef.current = historyRef.current.filter(e => e.strokeId !== entry.strokeId);
          redrawFromHistory();
          notifyStackChange();
          onDrawRef.current({
            type: 'undo', strokeId: entry.strokeId,
            x: 0, y: 0, color: '', size: 0, isEraser: false, userId,
          });
        } else {
          // clearMine undo: 지워진 판서 복원 + 이벤트 재방송
          historyRef.current.push(...entry.clearedEvents);
          redrawFromHistory();
          notifyStackChange();
          // 복원된 이벤트를 다른 참가자에게 재방송
          entry.clearedEvents.forEach(ev => onDrawRef.current(ev));
        }
      },

      redo: () => {
        const entry = redoStackRef.current.pop();
        if (!entry) return;
        undoStackRef.current.push(entry);

        if (entry.kind === 'stroke') {
          // 획 단위 redo: 이벤트 복원 + 재방송
          historyRef.current.push(...entry.events);
          redrawFromHistory();
          notifyStackChange();
          entry.events.forEach(ev => onDrawRef.current(ev));
        } else {
          // clearMine redo: 다시 삭제 + clearMine 재방송
          historyRef.current = historyRef.current.filter(ev => ev.userId !== userId);
          redrawFromHistory();
          notifyStackChange();
          onDrawRef.current({
            type: 'clear', x: 0, y: 0, color: '', size: 0,
            isEraser: false, userId,
            ...({ clearType: 'mine' } as any),
          } as any);
        }
      },
    }));

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingMode) return;
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const newStrokeId = `${userId}-${Date.now()}`;
      currentStrokeIdRef.current = newStrokeId;
      currentStrokeEventsRef.current = [];
      redoStackRef.current = [];

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      localLastPosRef.current = { x, y };

      const cr = getContentRect();
      const data: DrawData = {
        type: 'start',
        x: (x - cr.x) / cr.w, y: (y - cr.y) / cr.h,
        color, size, isEraser, userId, strokeId: newStrokeId,
      };
      historyRef.current.push(data);
      currentStrokeEventsRef.current.push(data);
      onDrawRef.current(data);
      lastEmitTimeRef.current = Date.now();
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.buttons !== 1 || !isDrawingMode) return;
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;

      if (drawRafRef.current === null) {
        drawRafRef.current = requestAnimationFrame(() => {
          const ctx = canvas.getContext('2d');
          const lastPos = localLastPosRef.current;
          if (ctx && lastPos) {
            const cr = getContentRect();
            const drawData: DrawData = {
              type: 'draw',
              x: (x - cr.x) / cr.w, y: (y - cr.y) / cr.h,
              color, size, isEraser, userId, strokeId: currentStrokeIdRef.current,
            };
            historyRef.current.push(drawData);
            currentStrokeEventsRef.current.push(drawData);
            localLastPosRef.current = { x, y };

            if (isEraser) {
              // 지우개: OffscreenCanvas 격리 재렌더 (타인 판서 보호)
              redrawFromHistory();
            } else {
              ctx.save();
              ctx.globalCompositeOperation = 'source-over';
              ctx.lineCap = 'round'; ctx.lineJoin = 'round';
              ctx.strokeStyle = color; ctx.lineWidth = size;
              ctx.beginPath();
              ctx.moveTo(lastPos.x, lastPos.y); ctx.lineTo(x, y); ctx.stroke();
              ctx.restore();
            }

            const now = Date.now();
            if (now - lastEmitTimeRef.current >= 30) {
              onDrawRef.current(drawData); lastEmitTimeRef.current = now;
            }
          }
          drawRafRef.current = null;
        });
      }
    };

    const endDrawing = (e?: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingMode) return;
      if (e) e.stopPropagation();

      if (currentStrokeIdRef.current && currentStrokeEventsRef.current.length > 0) {
        const endData: DrawData = {
          type: 'end', x: 0, y: 0, color, size, isEraser,
          userId, strokeId: currentStrokeIdRef.current,
        };
        historyRef.current.push(endData);
        currentStrokeEventsRef.current.push(endData);
        onDrawRef.current(endData);

        let shouldAddToUndo = true;
        if (isEraser) {
          // 픽셀 비교로 실제로 지운 게 있는지 정확히 확인
          shouldAddToUndo = checkEraserEffective();
        }

        if (shouldAddToUndo) {
          undoStackRef.current.push({
            kind: 'stroke',
            strokeId: currentStrokeIdRef.current,
            events: [...currentStrokeEventsRef.current],
          });
          notifyStackChange();
        }

        currentStrokeIdRef.current = '';
        currentStrokeEventsRef.current = [];
      }
      localLastPosRef.current = null;
    };

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full z-40 transition-colors duration-200 ${
          isDrawingMode ? 'pointer-events-auto cursor-crosshair bg-black/5' : 'pointer-events-none'
        }`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
      />
    );
  }
);

export default DrawingCanvas;
