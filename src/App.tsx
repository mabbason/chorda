import { useState, useCallback, useEffect, useRef } from "react";
import type { Song } from "./models/song";
import { parseMidi } from "./parsers/midi-parser";
import { usePlayback } from "./hooks/usePlayback";
import { WaterfallCanvas } from "./components/WaterfallCanvas";
import { FileLoader } from "./components/FileLoader";
import { Controls } from "./components/Controls";
import { snapToMeasure, buildLoopRange } from "./utils/loop";
import type { LoopRange } from "./utils/loop";

function App() {
  const [song, setSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [visibleHands, setVisibleHands] = useState<Set<string>>(
    () => new Set(["left", "right", "unknown"])
  );
  const [loop, setLoop] = useState<LoopRange | null>(null);
  const [loopAMeasure, setLoopAMeasure] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const playback = usePlayback(song);

  const handleFileLoad = useCallback(
    (arrayBuffer: ArrayBuffer, fileName: string) => {
      const parsed = parseMidi(arrayBuffer);
      // Fall back to filename if MIDI has no title
      if (!parsed.title || parsed.title === "Untitled") {
        parsed.title = fileName.replace(/\.(mid|midi)$/i, "");
      }
      setSong(parsed);
      setIsPlaying(false);
      setIsFinished(false);
      setCurrentTime(0);
      setSpeed(1);
      setLoop(null);
      setLoopAMeasure(null);
    },
    []
  );

  const handlePlay = useCallback(async () => {
    if (isFinished) {
      playback.stop();
      setIsFinished(false);
    }
    await playback.play();
    setIsPlaying(true);
  }, [playback, isFinished]);

  const handlePause = useCallback(() => {
    playback.pause();
    setIsPlaying(false);
  }, [playback]);

  const handleStop = useCallback(() => {
    playback.stop();
    setIsPlaying(false);
    setIsFinished(false);
    setCurrentTime(0);
  }, [playback]);

  const handleSeek = useCallback(
    (time: number) => {
      playback.seek(time);
      setCurrentTime(time);
      setIsFinished(false);
    },
    [playback]
  );

  const handleSpeedChange = useCallback((newSpeed: number) => {
    playback.changeSpeed(newSpeed);
    setSpeed(newSpeed);
  }, [playback]);

  const handleBack = useCallback(() => {
    playback.stop();
    setSong(null);
    setIsPlaying(false);
    setIsFinished(false);
    setCurrentTime(0);
    setSpeed(1);
    setLoop(null);
    setLoopAMeasure(null);
  }, [playback]);

  const handleToggleHand = useCallback((hand: string) => {
    setVisibleHands((prev) => {
      const next = new Set(prev);
      if (next.has(hand)) {
        next.delete(hand);
      } else {
        next.add(hand);
      }
      return next;
    });
  }, []);

  const handleSetA = useCallback(() => {
    if (!song) return;
    const time = playback.getCurrentTime();
    const measure = snapToMeasure(time, song.measures);
    setLoopAMeasure(measure);
    // If B was already set and A > old B, clear the loop
    setLoop(null);
  }, [song, playback]);

  const handleSetB = useCallback(() => {
    if (!song || loopAMeasure === null) return;
    const time = playback.getCurrentTime();
    let bMeasure = snapToMeasure(time, song.measures);
    // Ensure B >= A
    if (bMeasure < loopAMeasure) bMeasure = loopAMeasure;
    const range = buildLoopRange(loopAMeasure, bMeasure, song.measures);
    if (range) {
      setLoop(range);
      // Seek to loop start
      playback.seek(range.startSec);
      setCurrentTime(range.startSec);
    }
  }, [song, loopAMeasure, playback]);

  const handleClearLoop = useCallback(() => {
    setLoop(null);
    setLoopAMeasure(null);
  }, []);

  // Keyboard shortcut: space to play/pause
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && song) {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [song, isPlaying, handlePlay, handlePause]);

  // Update current time display from transport + auto-loop
  useEffect(() => {
    const update = () => {
      if (song) {
        const time = playback.getCurrentTime();
        setCurrentTime(time);

        // Auto-loop: seek back to A when reaching B
        if (loop && isPlaying && time >= loop.endSec) {
          playback.seek(loop.startSec);
          setCurrentTime(loop.startSec);
        } else if (time >= song.durationSec && isPlaying) {
          playback.pause();
          setIsPlaying(false);
          setIsFinished(true);
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [song, playback, isPlaying, loop]);

  if (!song) {
    return (
      <div className="h-screen bg-slate-900">
        <FileLoader onFileLoad={handleFileLoad} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <Controls
        isPlaying={isPlaying}
        songTitle={song.title}
        currentTime={currentTime}
        duration={song.durationSec}
        speed={speed}
        visibleHands={visibleHands}
        loop={loop}
        loopAMeasure={loopAMeasure}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSpeedChange={handleSpeedChange}
        onSeek={handleSeek}
        onBack={handleBack}
        onToggleHand={handleToggleHand}
        onSetA={handleSetA}
        onSetB={handleSetB}
        onClearLoop={handleClearLoop}
      />
      <div className="flex-1 overflow-hidden relative">
        <WaterfallCanvas
          song={song}
          getCurrentTime={playback.getCurrentTime}
          getState={playback.getState}
          visibleHands={visibleHands}
          loop={loop}
        />
        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <p className="text-white text-2xl font-bold mb-4">Song Complete!</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handlePlay}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded font-medium"
                >
                  Replay
                </button>
                <button
                  onClick={handleBack}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded"
                >
                  New Song
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
