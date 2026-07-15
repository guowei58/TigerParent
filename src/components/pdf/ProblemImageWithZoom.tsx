"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

type ProblemImageWithZoomProps = {
  src: string;
  alt: string;
  className?: string;
  boxClassName?: string;
  imgClassName: string;
  onLoad?: () => void;
  imgRef?: React.RefObject<HTMLImageElement | null>;
};

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

type Size = { width: number; height: number };

export function ProblemImageWithZoom({
  src,
  alt,
  className,
  boxClassName,
  imgClassName,
  onLoad,
  imgRef,
}: ProblemImageWithZoomProps) {
  const [zoom, setZoom] = useState(1);
  const [baseImgSize, setBaseImgSize] = useState<Size | null>(null);
  const [lockedBoxSize, setLockedBoxSize] = useState<Size | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const internalImgRef = useRef<HTMLImageElement>(null);
  const resolvedImgRef = imgRef ?? internalImgRef;

  useEffect(() => {
    setZoom(1);
    setBaseImgSize(null);
    setLockedBoxSize(null);
  }, [src]);

  const zoomed = zoom > 1;

  function zoomIn() {
    const box = boxRef.current;
    const img = resolvedImgRef.current;
    if (!box || !img || zoom >= ZOOM_MAX) return;

    if (!lockedBoxSize) {
      const boxRect = box.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      if (boxRect.width < 1 || boxRect.height < 1 || imgRect.width < 1 || imgRect.height < 1) {
        return;
      }
      setLockedBoxSize({
        width: Math.round(boxRect.width),
        height: Math.round(boxRect.height),
      });
      setBaseImgSize({
        width: Math.round(imgRect.width),
        height: Math.round(imgRect.height),
      });
    }

    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  function zoomOut() {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100);
      if (next <= 1) {
        setLockedBoxSize(null);
        setBaseImgSize(null);
      }
      return next;
    });
  }

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (imgRef) {
      (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = img;
    }
    onLoad?.();
  }

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || !zoomed) return;
    el.scrollTop = 0;
    el.scrollLeft = 0;
  }, [zoom, zoomed]);

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative",
        className,
        boxClassName,
        !boxClassName && "w-fit max-w-full",
        zoomed ? "overflow-auto" : "overflow-hidden",
      )}
      style={
        zoomed && lockedBoxSize
          ? {
              width: lockedBoxSize.width,
              height: lockedBoxSize.height,
              minWidth: lockedBoxSize.width,
              maxWidth: lockedBoxSize.width,
              minHeight: lockedBoxSize.height,
              maxHeight: lockedBoxSize.height,
            }
          : undefined
      }
    >
      <div className="pointer-events-none absolute top-2 right-2 z-10 flex items-center rounded-lg border border-slate-500/10 bg-white/5 shadow-none backdrop-blur-[1px]">
        <button
          type="button"
          onClick={zoomOut}
          disabled={!zoomed}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-900/80 hover:bg-white/15 disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4 drop-shadow-[0_0_2px_white]" aria-hidden />
        </button>
        <span className="min-w-[2.75rem] border-x border-slate-500/10 px-1 text-center text-xs font-semibold text-slate-900/75 drop-shadow-[0_0_2px_white]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-900/80 hover:bg-white/15 disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4 drop-shadow-[0_0_2px_white]" aria-hidden />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={resolvedImgRef}
        src={src}
        alt={alt}
        draggable={false}
        className={cn(imgClassName, zoomed && "!max-h-none !max-w-none")}
        style={
          zoomed && baseImgSize
            ? {
                width: Math.round(baseImgSize.width * zoom),
                height: Math.round(baseImgSize.height * zoom),
              }
            : undefined
        }
        onLoad={handleLoad}
      />
    </div>
  );
}
