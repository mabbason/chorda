const API_BASE = import.meta.env.VITE_SONG_API_URL || "http://localhost:3001";

export interface SongResult {
  id: string;
  title: string;
  artist: string;
  genre: string;
  difficulty: number;
  duration_sec: number;
  note_count: number;
  tempo_bpm: number;
}

export async function searchSongs(
  query?: string,
  options?: { genre?: string; difficulty?: number; limit?: number }
): Promise<SongResult[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (options?.genre) params.set("genre", options.genre);
  if (options?.difficulty) params.set("difficulty", String(options.difficulty));
  params.set("limit", String(options?.limit ?? 20));

  const res = await fetch(`${API_BASE}/api/songs/search?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSongMidi(id: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/api/songs/${encodeURIComponent(id)}/midi`);
  if (!res.ok) throw new Error("Failed to fetch MIDI");
  return res.arrayBuffer();
}

export async function fetchGenres(): Promise<{ genre: string; count: number }[]> {
  const res = await fetch(`${API_BASE}/api/songs/genres`);
  if (!res.ok) return [];
  return res.json();
}
