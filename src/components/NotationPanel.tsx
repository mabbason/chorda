import { useRef, useEffect, useCallback } from "react";
import type { Song } from "../models/song";
import { renderNotation } from "../renderer/notation-renderer";

interface Props {
  song: Song;
  getCurrentTime: () => number;
  visibleHands: Set<string>;
  expanded: boolean;
  onToggle: () => void;
}

const PANEL_HEIGHT = 100;

export function NotationPanel({ song, getCurrentTime, visibleHands, expanded, onToggle }: Props) {
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
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas, expanded]);

  useEffect(() => {
    if (!expanded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const animate = () => {
      const currentTime = getCurrentTime();
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;

      renderNotation(ctx, logicalWidth, logicalHeight, song, currentTime, visibleHands);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [song, getCurrentTime, visibleHands, expanded]);

  return (
    <div className="border-b border-n-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center py-1 bg-n-800/50 hover:bg-n-700/50 text-n-500 hover:text-n-300 transition-colors"
        title={expanded ? "Hide notation" : "Show notation"}
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-[10px] ml-1">Notation</span>
      </button>
      {expanded && (
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ height: PANEL_HEIGHT, background: "#272e3b" }}
        />
      )}
    </div>
  );
}
