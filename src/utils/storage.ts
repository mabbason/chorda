import type { SectionProgress } from "../engine/sections";

const STORAGE_PREFIX = "chorda-progress:";

function storageKey(songTitle: string): string {
  return STORAGE_PREFIX + songTitle;
}

export function saveProgress(
  songTitle: string,
  progress: SectionProgress[]
): void {
  try {
    localStorage.setItem(storageKey(songTitle), JSON.stringify(progress));
  } catch {
    // LocalStorage full or unavailable - silently fail
  }
}

export function loadProgress(
  songTitle: string,
  sectionCount: number
): SectionProgress[] | null {
  try {
    const raw = localStorage.getItem(storageKey(songTitle));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SectionProgress[];
    // Only restore if section count matches (song structure unchanged)
    if (parsed.length !== sectionCount) return null;

    return parsed;
  } catch {
    return null;
  }
}
