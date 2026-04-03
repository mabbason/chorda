import { useState, useEffect } from "react";
import { API_BASE } from "../utils/song-api";
import { fetchWithAuth } from "../utils/auth";
import type { SectionProgress } from "../engine/sections";

interface Props {
  userId: number;
  onClose: () => void;
  onSwitchUser: () => void;
  onLogout: () => void;
}

interface ProgressRow {
  song_title: string;
  section_progress: string;
  updated_at: string;
}

interface SongStats {
  songTitle: string;
  totalPracticeTimeSec: number;
  sectionsLearned: number;
  totalSections: number;
}

function formatTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-cyan-500 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Dashboard({ userId, onClose, onSwitchUser, onLogout }: Props) {
  const [stats, setStats] = useState<SongStats[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [songsStarted, setSongsStarted] = useState(0);
  const [songsCompleted, setSongsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API_BASE}/api/users/${userId}/progress`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: ProgressRow[]) => {
        const songStats: SongStats[] = [];
        let total = 0;
        let started = 0;
        let completed = 0;

        for (const row of rows) {
          try {
            const progress: SectionProgress[] = JSON.parse(row.section_progress);
            const practiceTime = progress.reduce((sum, s) => sum + (s.practiceTimeSec || 0), 0);
            const learned = progress.filter((s) => s.mastery === "learned").length;

            if (practiceTime > 0 || learned > 0) {
              songStats.push({
                songTitle: row.song_title,
                totalPracticeTimeSec: Math.round(practiceTime),
                sectionsLearned: learned,
                totalSections: progress.length,
              });
              total += practiceTime;
              started++;
              if (learned === progress.length) completed++;
            }
          } catch {
            continue;
          }
        }

        songStats.sort((a, b) => b.totalPracticeTimeSec - a.totalPracticeTimeSec);
        setStats(songStats);
        setTotalTime(Math.round(total));
        setSongsStarted(started);
        setSongsCompleted(completed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h2 className="text-lg font-bold">Progress Dashboard</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchUser}
            className="text-slate-400 hover:text-white text-sm px-2 py-1"
          >
            Switch User
          </button>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-white text-sm px-2 py-1"
          >
            Logout
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2 py-1"
          >
            &times; Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-slate-500 py-12">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {formatTime(totalTime)}
                </div>
                <div className="text-slate-500 text-xs mt-1">Total Practice</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{songsStarted}</div>
                <div className="text-slate-500 text-xs mt-1">Songs Started</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{songsCompleted}</div>
                <div className="text-slate-500 text-xs mt-1">Songs Mastered</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">Song Progress</h3>
              {stats.length === 0 && (
                <div className="text-center text-slate-600 py-8 text-sm">
                  No songs practiced yet. Pick a song to get started!
                </div>
              )}
              <div className="grid gap-2">
                {stats.map((s) => (
                  <div key={s.songTitle} className="bg-slate-800 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate">
                        {s.songTitle}
                      </span>
                      <span className="text-slate-500 text-xs shrink-0 ml-2">
                        {formatTime(s.totalPracticeTimeSec)}
                      </span>
                    </div>
                    <ProgressBar value={s.sectionsLearned} max={s.totalSections} />
                    <div className="text-slate-500 text-[10px] mt-1">
                      {s.sectionsLearned}/{s.totalSections} sections learned
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
