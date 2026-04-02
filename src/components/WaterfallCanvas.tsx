import { useRef, useEffect, useCallback } from "react";
import type { Song } from "../models/song";
import type { LoopRange } from "../utils/loop";
import { render } from "../renderer/waterfall-renderer";

interface Props {
  song: Song;
  getCurrentTime: () => number;
  getState: () => string;
  visibleHands: Set<string>;
  loop: LoopRange | null;
}

export function WaterfallCanvas({ song, getCurrentTime, getState, visibleHands, loop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const animate = () => {
      const currentTime = getCurrentTime();

      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;

      const virtualCanvas = {
        width: logicalWidth,
        height: logicalHeight,
      } as HTMLCanvasElement;

      render(ctx, virtualCanvas, song, currentTime, visibleHands, loop);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [song, getCurrentTime, getState, visibleHands, loop]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: "#0f172a" }}
    />
  );
}
