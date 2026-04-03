import { API_BASE } from "./song-api";

export interface User {
  id: number;
  name: string;
  avatar: string;
  created_at: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId: number | null;
}

const opts: RequestInit = { credentials: "include" };

// --- Token refresh with 401 interception ---

let refreshPromise: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, { ...opts, method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const mergedInit = { ...init, credentials: "include" as const };
  let res = await fetch(input, mergedInit);

  if (res.status === 401) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => { refreshPromise = null; });
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      // Retry original request with new access token
      res = await fetch(input, mergedInit);
    } else {
      onSessionExpired?.();
    }
  }

  return res;
}

// --- Auth API calls ---

export async function checkAuth(): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/check`, opts);
  if (!res.ok) return { authenticated: false, userId: null };
  return res.json();
}

export async function submitPassphrase(passphrase: string): Promise<{ ok: boolean; error?: string; retryAfterSec?: number }> {
  const res = await fetch(`${API_BASE}/api/auth/verify`, {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error, retryAfterSec: data.retryAfterSec };
  return { ok: true };
}

export async function selectUser(userId: number): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/select-user`, {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { ...opts, method: "POST" });
}

export async function changePassphrase(
  currentPassphrase: string,
  newPassphrase: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/change-passphrase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassphrase, newPassphrase }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true };
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/users`);
  if (!res.ok) return [];
  return res.json();
}

export async function createUser(name: string, avatar: string): Promise<User> {
  const res = await fetchWithAuth(`${API_BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatar }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create user");
  }
  return res.json();
}
