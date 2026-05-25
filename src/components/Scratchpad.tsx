"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "./ui/Button";
import type { Stroke, StrokePoint } from "@/lib/strokes";

export type { Stroke, StrokePoint };
export { strokesToJson } from "@/lib/strokes";

export type ScratchpadMeta = {
  drawingSeconds: number;
};

type ScratchpadProps = {
  onChange?: (strokes: Stroke[], meta: ScratchpadMeta) => void;
  initialStrokes?: Stroke[];
  className?: string;
};

export function Scratchpad({ onChange, initialStrokes = [], className }: ScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const drawingRef = useRef(false);
  const drawingStartRef = useRef<number | null>(null);
  const drawingSecondsRef = useRef(0);

  const emitChange = useCallback(
    (next: Stroke[]) => {
      onChange?.(next, { drawingSeconds: drawingSecondsRef.current });
    },
    [onChange],
  );

  const redraw = useCallback(
    (allStrokes: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    },
    [],
  );

  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      redraw(strokes);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw, strokes]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    drawingStartRef.current = Date.now();
    const point = getPoint(e);
    const width = e.pointerType === "pen" ? 2 + (point.pressure ?? 0.5) * 2 : 3;
    setCurrentStroke({ points: [point], color: "#1e293b", width });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStroke) return;
    e.preventDefault();
    const point = getPoint(e);
    const updated = {
      ...currentStroke,
      points: [...currentStroke.points, point],
    };
    setCurrentStroke(updated);
    redraw([...strokes, updated]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStroke) return;
    e.preventDefault();
    drawingRef.current = false;
    if (drawingStartRef.current !== null) {
      drawingSecondsRef.current +=
        (Date.now() - drawingStartRef.current) / 1000;
      drawingStartRef.current = null;
    }
    const final = currentStroke;
    const next = [...strokes, final];
    setStrokes(next);
    setCurrentStroke(null);
    emitChange(next);
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    drawingSecondsRef.current = 0;
    emitChange([]);
  };

  const undo = () => {
    const next = strokes.slice(0, -1);
    setStrokes(next);
    emitChange(next);
  };

  return (
    <div className={className}>
      <div className="mb-2 flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={undo}>
          Undo
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-64 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: "none" }}
      />
      <p className="mt-2 text-xs text-slate-400">
        Use stylus, finger, or mouse to show your work
      </p>
    </div>
  );
}
