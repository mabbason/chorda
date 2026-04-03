import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Song } from "./models/song";
import { parseMidi } from "./parsers/midi-parser";
import { usePlayback } from "./hooks/usePlayback";
import { WaterfallCanvas } from "./components/WaterfallCanvas";
import { FileLoader } from "./components/FileLoader";
import { Controls } from "./components/Controls";
import { SectionsPanel } from "./components/SectionsPanel";
import { NotationPanel } from "./components/NotationPanel";
import { Dashboard } from "./components/Dashboard";
import { PassphraseGate } from "./components/PassphraseGate";
import { UserPicker } from "./components/UserPicker";
import { UserMenu } from "./components/UserMenu";
import { snapToMeasure, buildLoopRange } from "./utils/loop";
import type { LoopRange } from "./utils/loop";
import {
  buildSections,
  initProgress,
  findCurrentSection,
  markLearned as markSectionLearned,
  markPlayed,
  addPracticeTime,
  suggestNextStep,
} from "./engine/sections";
import type { Section, SectionProgress } from "./engine/sections";
import { loadProgress, saveProgress, loadAllProgress } from "./utils/storage";
import { checkAuth, setSessionExpiredHandler } from "./utils/auth";

type AuthState = "checking" | "passphrase" | "user-picker" | "ready";

function App() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [userId, setUserId] = useState<number | null>(null);
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
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionProgress, setSectionProgress] = useState<SectionProgress[]>([]);
  const [showSections, setShowSections] = useState(true);
  const [showNotation, setShowNotation] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const rafRef = useRef<number>(0);
  const lastSectionRef = useRef<number>(-1);
  const practiceTimeRef = useRef<number>(0);

  // Check auth on mount
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAuthState("passphrase");
      setUserId(null);
      setSong(null);
    });

    checkAuth().then(async (status) => {
      if (!status.authenticated) {
        setAuthState("passphrase");
      } else if (!status.userId) {
        setAuthState("user-picker");
      } else {
        setUserId(status.userId);
        await loadAllProgress(status.userId);
        setAuthState("ready");
      }
    }).catch(() => setAuthState("passphrase"));
  }, []);

  const playback = usePlayback(song, visibleHands);

  const currentSectionIndex = useMemo(
    () => (sections.length > 0 ? findCurrentSection(sections, currentTime) : 0),
    [sections, currentTime]
  );

  const guidedStep = useMemo(
    () =>
      sectionProgress.length > 0
        ? suggestNextStep(
            sectionProgress[currentSectionIndex],
            visibleHands,
            currentSectionIndex === sections.length - 1
          )
        : ("right-hand" as const),
    [sectionProgress, currentSectionIndex, visibleHands, sections.length]
  );

  const handleFileLoad = useCallback(
    (arrayBuffer: ArrayBuffer, fileName: string) => {
      const parsed = parseMidi(arrayBuffer);
      // Fall back to filename if MIDI has no title
      if (!parsed.title || parsed.title === "Untitled") {
        parsed.title = fileName.replace(/\.(mid|midi)$/i, "");
      }
      const newSections = buildSections(parsed);
      const savedProgress = loadProgress(parsed.title, newSections.length);

      setSong(parsed);
      setSections(newSections);
      setSectionProgress(savedProgress ?? initProgress(newSections));
      setIsPlaying(false);
      setIsFinished(false);
      setCurrentTime(0);
      setSpeed(1);
      setLoop(null);
      setLoopAMeasure(null);
      lastSectionRef.current = -1;
      practiceTimeRef.current = 0;
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

  const handleMenuDashboard = useCallback(() => {
    setShowDashboard(true);
  }, []);

  const handleMenuSwitchUser = useCallback(() => {
    setShowDashboard(false);
    setSong(null);
    setUserId(null);
    setAuthState("user-picker");
  }, []);

  const handleMenuLogout = useCallback(() => {
    setShowDashboard(false);
    setSong(null);
    setUserId(null);
    setAuthState("passphrase");
  }, []);

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

  const handleJumpToSection = useCallback(
    (sectionIndex: number) => {
      if (sectionIndex < 0 || sectionIndex >= sections.length) return;
      const section = sections[sectionIndex];
      playback.seek(section.startSec);
      setCurrentTime(section.startSec);

      // Auto-set loop to this section
      const range = buildLoopRange(section.startMeasure, section.endMeasure, song!.measures);
      if (range) {
        setLoop(range);
        setLoopAMeasure(section.startMeasure);
      }
    },
    [sections, playback, song]
  );

  const handleMarkLearned = useCallback(
    (sectionIndex: number) => {
      setSectionProgress((prev) => {
        const next = [...prev];
        next[sectionIndex] = markSectionLearned(next[sectionIndex]);
        if (song && userId) saveProgress(song.title, next, userId, true);
        return next;
      });
    },
    [song, userId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!song) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (isPlaying) { handlePause(); } else { handlePlay(); }
          break;
        case "BracketLeft":
          e.preventDefault();
          handleSetA();
          break;
        case "BracketRight":
          e.preventDefault();
          handleSetB();
          break;
        case "Escape":
          handleClearLoop();
          break;
        case "ArrowLeft":
          if (e.shiftKey) {
            e.preventDefault();
            handleJumpToSection(Math.max(0, currentSectionIndex - 1));
          }
          break;
        case "ArrowRight":
          if (e.shiftKey) {
            e.preventDefault();
            handleJumpToSection(Math.min(sections.length - 1, currentSectionIndex + 1));
          }
          break;
        case "KeyL":
          if (e.shiftKey) {
            e.preventDefault();
            handleMarkLearned(currentSectionIndex);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [song, isPlaying, handlePlay, handlePause, handleSetA, handleSetB, handleClearLoop, handleJumpToSection, handleMarkLearned, currentSectionIndex, sections.length]);

  // Update current time, auto-loop, practice time tracking
  useEffect(() => {
    let lastFrameTime = performance.now();

    const update = () => {
      if (song) {
        const time = playback.getCurrentTime();
        setCurrentTime(time);

        // Track practice time per section
        if (isPlaying && sections.length > 0) {
          const now = performance.now();
          const deltaSec = (now - lastFrameTime) / 1000;
          lastFrameTime = now;

          const secIdx = findCurrentSection(sections, time);

          // Detect section boundary crossing (completed a play-through)
          if (lastSectionRef.current !== -1 && secIdx !== lastSectionRef.current) {
            setSectionProgress((prev) => {
              const next = [...prev];
              next[lastSectionRef.current] = markPlayed(next[lastSectionRef.current]);
              if (song && userId) saveProgress(song.title, next, userId);
              return next;
            });
          }
          lastSectionRef.current = secIdx;

          // Accumulate practice time (batch every ~1 second)
          practiceTimeRef.current += deltaSec;
          if (practiceTimeRef.current >= 1) {
            const accumulated = practiceTimeRef.current;
            practiceTimeRef.current = 0;
            setSectionProgress((prev) => {
              const next = [...prev];
              next[secIdx] = addPracticeTime(next[secIdx], accumulated);
              if (song && userId) saveProgress(song.title, next, userId);
              return next;
            });
          }
        } else {
          lastFrameTime = performance.now();
        }

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
  }, [song, playback, isPlaying, loop, sections, userId]);

  // Auth gates
  if (authState === "checking") {
    return (
      <div className="h-screen bg-n-900 flex items-center justify-center">
        <div className="text-n-500">Loading...</div>
      </div>
    );
  }

  if (authState === "passphrase") {
    return <PassphraseGate onSuccess={() => setAuthState("user-picker")} />;
  }

  if (authState === "user-picker") {
    return (
      <UserPicker
        onUserSelected={async (id) => {
          setUserId(id);
          await loadAllProgress(id);
          setAuthState("ready");
        }}
        onLogout={() => setAuthState("passphrase")}
      />
    );
  }

  if (showDashboard) {
    return (
      <div className="h-screen bg-n-900">
        <Dashboard
          userId={userId!}
          onClose={() => setShowDashboard(false)}
          onSwitchUser={() => {
            setShowDashboard(false);
            setSong(null);
            setUserId(null);
            setAuthState("user-picker");
          }}
          onLogout={() => {
            setShowDashboard(false);
            setSong(null);
            setUserId(null);
            setAuthState("passphrase");
          }}
        />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="h-screen bg-n-900 flex flex-col">
        <div className="flex justify-end px-4 pt-3">
          <UserMenu
            onDashboard={handleMenuDashboard}
            onSwitchUser={handleMenuSwitchUser}
            onLogout={handleMenuLogout}
          />
        </div>
        <div className="flex-1">
          <FileLoader onFileLoad={handleFileLoad} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-n-900 flex flex-col">
      <Controls
        isPlaying={isPlaying}
        songTitle={song.title}
        currentTime={currentTime}
        duration={song.durationSec}
        speed={speed}
        visibleHands={visibleHands}
        loop={loop}
        loopAMeasure={loopAMeasure}
        samplerLoaded={playback.samplerLoaded}
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
        showSections={showSections}
        onToggleSections={() => setShowSections((p) => !p)}
        onDashboard={handleMenuDashboard}
        onSwitchUser={handleMenuSwitchUser}
        onLogout={handleMenuLogout}
      />
      <NotationPanel
        song={song}
        getCurrentTime={playback.getCurrentTime}
        visibleHands={visibleHands}
        expanded={showNotation}
        onToggle={() => setShowNotation((p) => !p)}
      />
      <div className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 relative">
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
                    className="bg-purple-base hover:bg-purple-light text-white px-6 py-2 rounded font-medium"
                  >
                    Replay
                  </button>
                  <button
                    onClick={handleBack}
                    className="bg-n-700 hover:bg-n-600 text-white px-6 py-2 rounded"
                  >
                    New Song
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {showSections && sections.length > 0 && (
          <SectionsPanel
            sections={sections}
            progress={sectionProgress}
            currentSectionIndex={currentSectionIndex}
            guidedStep={guidedStep}
            onJumpToSection={handleJumpToSection}
            onMarkLearned={handleMarkLearned}
          />
        )}
      </div>
    </div>
  );
}

export default App;
