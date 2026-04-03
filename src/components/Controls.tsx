import type { LoopRange } from "../utils/loop";
import { UserMenu } from "./UserMenu";

interface Props {
  isPlaying: boolean;
  songTitle: string;
  currentTime: number;
  duration: number;
  speed: number;
  visibleHands: Set<string>;
  loop: LoopRange | null;
  loopAMeasure: number | null;
  samplerLoaded: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: number) => void;
  onBack: () => void;
  onToggleHand: (hand: string) => void;
  onSetA: () => void;
  onSetB: () => void;
  onClearLoop: () => void;
  showSections: boolean;
  onToggleSections: () => void;
  onDashboard: () => void;
  onSwitchUser: () => void;
  onLogout: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <polygon points="2,0 14,7 2,14" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="0" width="4" height="14" rx="1" />
      <rect x="9" y="0" width="4" height="14" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="0" y="0" width="12" height="12" rx="2" />
    </svg>
  );
}

export function Controls({
  isPlaying,
  songTitle,
  currentTime,
  duration,
  speed,
  samplerLoaded,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onSeek,
  onBack,
  visibleHands,
  onToggleHand,
  loop,
  loopAMeasure,
  onSetA,
  onSetB,
  onClearLoop,
  showSections,
  onToggleSections,
  onDashboard,
  onSwitchUser,
  onLogout,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-n-800 border-b border-n-700">
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-full bg-n-700 hover:bg-n-600 text-n-300 hover:text-white flex items-center justify-center"
        title="Back to file picker"
        aria-label="Back"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-white font-medium text-sm truncate max-w-[200px]">
        {songTitle}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!samplerLoaded}
          className={`w-9 h-9 rounded-full text-white flex items-center justify-center ${
            samplerLoaded
              ? "bg-purple-base hover:bg-purple-light"
              : "bg-n-600 cursor-wait"
          }`}
          title={!samplerLoaded ? "Loading piano..." : isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {!samplerLoaded ? (
            <span className="text-[10px]">...</span>
          ) : isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          onClick={onStop}
          className="w-8 h-8 rounded-full bg-n-700 hover:bg-n-600 text-n-300 flex items-center justify-center"
          title="Stop"
          aria-label="Stop"
        >
          <StopIcon />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-1">
        <span className="text-n-400 text-xs w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-purple-light"
        />
        <span className="text-n-400 text-xs w-10">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {[
          { hand: "left", label: "L", color: "green" },
          { hand: "right", label: "R", color: "purple" },
        ].map(({ hand, label, color }) => {
          const active = visibleHands.has(hand);
          return (
            <button
              key={hand}
              onClick={() => onToggleHand(hand)}
              className={`w-7 h-7 rounded text-xs font-bold ${
                active
                  ? color === "purple"
                    ? "bg-purple-base text-white"
                    : "bg-brand-green-base text-white"
                  : "bg-n-700 text-n-500"
              }`}
              title={`${active ? "Hide" : "Show"} ${hand} hand`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onSetA}
          className={`px-2 py-1 rounded text-xs font-medium ${
            loopAMeasure !== null && !loop
              ? "bg-yellow-base text-white"
              : "bg-n-700 text-n-300 hover:bg-n-600"
          }`}
          title="Set loop start at current position"
        >
          A
        </button>
        <button
          onClick={onSetB}
          disabled={loopAMeasure === null}
          className={`px-2 py-1 rounded text-xs font-medium ${
            loop
              ? "bg-yellow-base text-white"
              : loopAMeasure !== null
                ? "bg-n-700 text-n-300 hover:bg-n-600"
                : "bg-n-800 text-n-600 cursor-not-allowed"
          }`}
          title="Set loop end at current position"
        >
          B
        </button>
        {loop && (
          <button
            onClick={onClearLoop}
            className="px-2 py-1 rounded text-xs bg-n-700 text-n-300 hover:bg-n-600"
            title="Clear loop"
          >
            &times;
          </button>
        )}
        {loop && (
          <span className="text-yellow-base text-xs">
            m{loop.startMeasure + 1}-{loop.endMeasure + 1}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-n-400 text-xs">Speed:</span>
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded text-xs ${
              speed === s
                ? "bg-purple-base text-white"
                : "bg-n-700 text-n-300 hover:bg-n-600"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        onClick={onToggleSections}
        className={`px-2 py-1 rounded text-xs ${
          showSections
            ? "bg-purple-base text-white"
            : "bg-n-700 text-n-300 hover:bg-n-600"
        }`}
        title={showSections ? "Hide sections panel" : "Show sections panel"}
      >
        Sections
      </button>

      <UserMenu
        onDashboard={onDashboard}
        onSwitchUser={onSwitchUser}
        onLogout={onLogout}
      />
    </div>
  );
}
