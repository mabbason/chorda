interface Props {
  isPlaying: boolean;
  songTitle: string;
  currentTime: number;
  duration: number;
  speed: number;
  visibleHands: Set<string>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: number) => void;
  onBack: () => void;
  onToggleHand: (hand: string) => void;
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
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onSeek,
  onBack,
  visibleHands,
  onToggleHand,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700">
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white px-2 py-1 text-sm"
        title="Back to file picker"
      >
        &larr;
      </button>

      <span className="text-white font-medium text-sm truncate max-w-[200px]">
        {songTitle}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-9 h-9 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center"
          title={isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          onClick={onStop}
          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"
          title="Stop"
          aria-label="Stop"
        >
          <StopIcon />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-1">
        <span className="text-slate-400 text-xs w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-cyan-500"
        />
        <span className="text-slate-400 text-xs w-10">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {[
          { hand: "right", label: "R", color: "cyan" },
          { hand: "left", label: "L", color: "green" },
        ].map(({ hand, label, color }) => {
          const active = visibleHands.has(hand);
          return (
            <button
              key={hand}
              onClick={() => onToggleHand(hand)}
              className={`w-7 h-7 rounded text-xs font-bold ${
                active
                  ? color === "cyan"
                    ? "bg-cyan-600 text-white"
                    : "bg-green-600 text-white"
                  : "bg-slate-700 text-slate-500"
              }`}
              title={`${active ? "Hide" : "Show"} ${hand} hand`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-xs">Speed:</span>
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded text-xs ${
              speed === s
                ? "bg-cyan-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
