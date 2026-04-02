import { useCallback, useState, useRef, useEffect } from "react";
import { STARTER_SONGS } from "../data/starter-songs";
import type { StarterSong } from "../data/starter-songs";
import { searchSongs, fetchSongMidi } from "../utils/song-api";
import type { SongResult } from "../utils/song-api";

interface Props {
  onFileLoad: (arrayBuffer: ArrayBuffer, fileName: string) => void;
}

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-green-600",
  2: "bg-cyan-600",
  3: "bg-amber-600",
  4: "bg-red-600",
  5: "bg-purple-600",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FileLoader({ onFileLoad }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Check if the song API is available
  useEffect(() => {
    searchSongs("", { limit: 1 })
      .then((r) => setApiAvailable(r.length > 0))
      .catch(() => setApiAvailable(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !apiAvailable) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchSongs(query, { limit: 20 });
        setResults(res);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, apiAvailable]);

  const handleFile = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      onFileLoad(buffer, file.name);
    },
    [onFileLoad]
  );

  const handleStarterSong = useCallback(
    async (song: StarterSong) => {
      setLoading(song.file);
      try {
        const response = await fetch(`/songs/${song.file}`);
        const buffer = await response.arrayBuffer();
        onFileLoad(buffer, song.file);
      } catch {
        setLoading(null);
      }
    },
    [onFileLoad]
  );

  const handleSearchResult = useCallback(
    async (song: SongResult) => {
      setLoading(song.id);
      try {
        const buffer = await fetchSongMidi(song.id);
        onFileLoad(buffer, `${song.title}.mid`);
      } catch {
        setLoading(null);
      }
    },
    [onFileLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".mid") || file.name.endsWith(".midi"))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex flex-col items-center h-full py-8 px-4 overflow-y-auto"
    >
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Piano Trainer</h1>
        <p className="text-slate-400">Choose a song to start learning</p>
      </div>

      {/* Search bar */}
      {apiAvailable && (
        <div className="w-full max-w-2xl mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 11,000+ songs..."
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {/* Search results */}
      {query.trim() && results.length > 0 && (
        <div className="w-full max-w-2xl mb-6">
          <div className="text-slate-500 text-xs mb-2">
            {searching ? "Searching..." : `${results.length} results`}
          </div>
          <div className="grid gap-1.5 max-h-[400px] overflow-y-auto">
            {results.map((song) => (
              <button
                key={song.id}
                onClick={() => handleSearchResult(song)}
                disabled={loading !== null}
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors disabled:opacity-50"
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${LEVEL_COLORS[song.difficulty] ?? "bg-slate-600"}`}
                >
                  {LEVEL_LABELS[song.difficulty] ?? "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {loading === song.id ? "Loading..." : song.title}
                  </div>
                  <div className="text-slate-500 text-xs truncate">
                    {song.artist} — {song.genre} — {formatDuration(song.duration_sec)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {query.trim() && results.length === 0 && !searching && (
        <div className="w-full max-w-2xl mb-6 text-center text-slate-500 text-sm py-4">
          No songs found for "{query}"
        </div>
      )}

      {/* Starter songs (show when not searching) */}
      {!query.trim() && (
        <div className="w-full max-w-2xl mb-8">
          <div className="text-slate-500 text-xs mb-2">Starter songs</div>
          <div className="grid gap-2">
            {STARTER_SONGS.map((song) => (
              <button
                key={song.file}
                onClick={() => handleStarterSong(song)}
                disabled={loading !== null}
                className="flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors disabled:opacity-50"
              >
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${LEVEL_COLORS[song.level]}`}
                >
                  {song.levelLabel}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {loading === song.file ? "Loading..." : song.title}
                  </div>
                  <div className="text-slate-500 text-xs truncate">
                    {song.composer} — {song.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-slate-500 text-xs mb-3">or load your own</div>

      <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 hover:border-cyan-500 transition-colors cursor-pointer">
        <label className="cursor-pointer flex flex-col items-center gap-2">
          <svg
            className="w-8 h-8 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-slate-400 text-sm">Drop a MIDI file or click to browse</span>
          <input
            type="file"
            accept=".mid,.midi"
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
