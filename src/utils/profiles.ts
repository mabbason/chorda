export interface UserProfile {
  name: string;
  createdAt: string;
}

export interface SongStats {
  songTitle: string;
  totalPracticeTimeSec: number;
  sectionsLearned: number;
  totalSections: number;
  lastPracticedAt: string;
}

export interface ProfileData {
  profile: UserProfile;
  songStats: SongStats[];
  totalPracticeTimeSec: number;
  songsStarted: number;
  songsCompleted: number;
}

const PROFILES_KEY = "chorda-profiles";
const ACTIVE_PROFILE_KEY = "chorda-active-profile";
const PROGRESS_PREFIX = "chorda-progress:";

export function getProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: UserProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function createProfile(name: string): UserProfile {
  const profiles = getProfiles();
  const profile: UserProfile = { name, createdAt: new Date().toISOString() };
  profiles.push(profile);
  saveProfiles(profiles);
  setActiveProfile(name);
  return profile;
}

export function getActiveProfile(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfile(name: string) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, name);
}

export function getProfileStorageKey(profileName: string, songTitle: string): string {
  return `${PROGRESS_PREFIX}${profileName}:${songTitle}`;
}

export function getProfileData(profileName: string): ProfileData {
  const profiles = getProfiles();
  const profile = profiles.find((p) => p.name === profileName) ?? {
    name: profileName,
    createdAt: new Date().toISOString(),
  };

  const songStats: SongStats[] = [];
  let totalPracticeTimeSec = 0;
  let songsStarted = 0;
  let songsCompleted = 0;

  // Scan localStorage for this profile's song progress
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PROGRESS_PREFIX)) continue;

    // Check if it belongs to this profile (new format) or is legacy (no profile)
    const isProfiled = key.startsWith(`${PROGRESS_PREFIX}${profileName}:`);
    const isLegacy = !key.includes(":") || key.split(":").length === 2;

    if (!isProfiled && !(isLegacy && profileName === getActiveProfile())) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const progress = JSON.parse(raw);
      if (!Array.isArray(progress)) continue;

      const songTitle = isProfiled
        ? key.slice(`${PROGRESS_PREFIX}${profileName}:`.length)
        : key.slice(PROGRESS_PREFIX.length);

      const practiceTime = progress.reduce(
        (sum: number, s: any) => sum + (s.practiceTimeSec || 0),
        0
      );
      const learned = progress.filter((s: any) => s.mastery === "learned").length;
      const total = progress.length;

      if (practiceTime > 0 || learned > 0) {
        songStats.push({
          songTitle,
          totalPracticeTimeSec: Math.round(practiceTime),
          sectionsLearned: learned,
          totalSections: total,
          lastPracticedAt: new Date().toISOString(),
        });

        totalPracticeTimeSec += practiceTime;
        songsStarted++;
        if (learned === total) songsCompleted++;
      }
    } catch {
      continue;
    }
  }

  songStats.sort((a, b) => b.totalPracticeTimeSec - a.totalPracticeTimeSec);

  return {
    profile,
    songStats,
    totalPracticeTimeSec: Math.round(totalPracticeTimeSec),
    songsStarted,
    songsCompleted,
  };
}
