"use client";

import { useEffect, useRef } from "react";
import type { Stroke } from "@/lib/strokes";

export function StrokeViewer({
  strokeData,
  width = 600,
  height = 300,
  className = "",
  emptyMessage = "No stroke data saved",
}: {
  strokeData: unknown;
  width?: number;
  height?: number;
  className?: string;
  emptyMessage?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = (Array.isArray(strokeData) ? strokeData : []) as Stroke[];
  const hasDrawableStrokes = strokes.some((s) => (s.points?.length ?? 0) >= 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawableStrokes) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, width, height);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const stroke of strokes) {
      for (const p of stroke.points ?? []) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const pad = 12;
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const scale = Math.min(
      (width - pad * 2) / contentW,
      (height - pad * 2) / contentH,
      1.5,
    );
    const offsetX = (width - contentW * scale) / 2 - minX * scale;
    const offsetY = (height - contentH * scale) / 2 - minY * scale;

    for (const stroke of strokes) {
      if (!stroke.points?.length || stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color ?? "#1e293b";
      ctx.lineWidth = (stroke.width ?? 2) * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const first = stroke.points[0];
      ctx.moveTo(first.x * scale + offsetX, first.y * scale + offsetY);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.x * scale + offsetX, p.y * scale + offsetY);
      }
      ctx.stroke();
    }
  }, [strokes, width, height, hasDrawableStrokes]);

  if (!hasDrawableStrokes) {
    return <p className="text-slate-500 text-sm">{emptyMessage}</p>;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-xl border border-slate-200 bg-slate-50 ${className}`}
      style={{ maxWidth: width, height }}
    />
  );
}
