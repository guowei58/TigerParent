"use client";

import { useEffect, useRef } from "react";
import type { Stroke } from "@/lib/strokes";

export function StrokeViewer({ strokeData }: { strokeData: unknown }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = (Array.isArray(strokeData) ? strokeData : []) as Stroke[];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 300;
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (!stroke.points?.length || stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color ?? "#1e293b";
      ctx.lineWidth = stroke.width ?? 2;
      ctx.lineCap = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes]);

  if (!strokes.length) {
    return <p className="text-slate-500 mt-2">No stroke data saved</p>;
  }

  return (
    <canvas
      ref={canvasRef}
      className="mt-3 w-full rounded-xl border border-slate-200"
      style={{ maxWidth: 600, height: 300 }}
    />
  );
}
