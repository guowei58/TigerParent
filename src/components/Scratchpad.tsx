"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";
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
  canvasClassName?: string;
  /** Hides helper text and uses tighter controls */
  compact?: boolean;
  /** Undo / Clear overlay inside the dashed pad */
  controlsInside?: boolean;
};

export function Scratchpad({
  onChange,
  initialStrokes = [],
  className,
  canvasClassName = "h-64 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50",
  compact = false,
  controlsInside = false,
}: ScratchpadProps) {
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

  const toolbar = (
    <div className="flex gap-1">
      <Button type="button" variant="secondary" size="sm" onClick={undo}>
        Undo
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        Clear
      </Button>
    </div>
  );

  if (controlsInside) {
    return (
      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-start p-2">
          <div className="pointer-events-auto flex gap-1 rounded-lg bg-white/90 p-0.5 shadow-sm backdrop-blur-sm">
            {toolbar}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full min-h-0 w-full flex-1 touch-none border-0 bg-transparent",
            canvasClassName,
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: "none" }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={cn("flex gap-2", compact ? "mb-1" : "mb-2")}>{toolbar}</div>
      <canvas
        ref={canvasRef}
        className={canvasClassName}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: "none" }}
      />
      {!compact && (
        <p className="mt-2 text-xs text-slate-400">
          Use stylus, finger, or mouse to show your work
        </p>
      )}
    </div>
  );
}
