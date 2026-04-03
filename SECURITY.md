# Chorda Security Plan

## Current State (2026-04-03)

The app is live at https://chorda.mabbason.com with **no authentication**. The API serves 11K MIDI files to anyone who hits it. This document describes the security measures to implement.

## Architecture

```
Browser → Nginx (chorda.mabbason.com)
            ├── Static frontend (dist/)
            └── /api/* → Express.js (port 3001) → SQLite + MIDI files
```

## Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Unauthorized access to song library | High (public URL) | Medium (bandwidth/cost) | Passphrase gate + API token |
| Brute-force passphrase | Medium | High (grants full access) | Exponential backoff + lockout |
| DDoS on API | Low | High (server down) | Nginx + Express rate limiting |
| Bulk scraping 11K MIDI files | Medium | Medium (bandwidth) | Per-IP download rate limit |
| API abuse from other origins | Low | Low | CORS lockdown |
| Session hijacking | Very low | Medium | httpOnly cookie, short expiry |

## Implementation Plan (7 measures)

### 1. Passphrase Gate (Frontend)

**File:** `src/components/PassphraseGate.tsx`

- Full-screen passphrase prompt on first visit
- Single shared family passphrase (set via env var `CHORDA_PASSPHRASE`)
- On correct entry: calls `POST /api/auth/verify` → receives session token
- Token stored as httpOnly cookie (set by server, not accessible to JS)
- Gate checks for valid session on load via `GET /api/auth/check`
- Wrap the entire `<App />` in `<PassphraseGate>` so nothing renders without auth

**UX:** Clean dark modal, single input field, "Enter" to submit. No username needed. Show "Incorrect passphrase" on failure with subtle shake animation. Remember session for 30 days.

### 2. API Rate Limiting (Express)

**Package:** `express-rate-limit`

```typescript
import rateLimit from 'express-rate-limit';

// General API: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use('/api/', apiLimiter);

// Auth endpoint: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, try again later' },
});
app.use('/api/auth/verify', authLimiter);

// MIDI download: 30 downloads per 10 minutes per IP
const downloadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Download limit reached' },
});
app.use('/api/songs/:id/midi', downloadLimiter);
```

### 3. Nginx Rate Limiting (Second Layer)

**File:** `/etc/nginx/sites-available/chorda.mabbason.com`

Add to the `http` block in `/etc/nginx/nginx.conf` (or the site config):

```nginx
# Rate limit zones
limit_req_zone $binary_remote_addr zone=chorda_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=chorda_auth:10m rate=1r/m;

server {
    # ...existing config...

    # API proxy with rate limiting
    location /api/ {
        limit_req zone=chorda_api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001;
        # ...existing proxy headers...
    }

    # Stricter limit on auth endpoint
    location /api/auth/verify {
        limit_req zone=chorda_auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:3001;
        # ...existing proxy headers...
    }
}
```

This catches abuse before it even reaches Node.js.

### 4. Session Token (JWT)

**Package:** `jsonwebtoken`

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.CHORDA_JWT_SECRET || 'change-me-in-production';
const TOKEN_EXPIRY = '30d';

// POST /api/auth/verify
app.post('/api/auth/verify', authLimiter, (req, res) => {
  const { passphrase } = req.body;
  if (passphrase !== process.env.CHORDA_PASSPHRASE) {
    return res.status(401).json({ error: 'Incorrect passphrase' });
  }

  const token = jwt.sign({ access: true }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  res.cookie('chorda_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.json({ ok: true });
});

// GET /api/auth/check
app.get('/api/auth/check', (req, res) => {
  const token = req.cookies?.chorda_token;
  if (!token) return res.json({ authenticated: false });

  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

// Middleware: require auth for all /api/songs/* routes
function requireAuth(req, res, next) {
  const token = req.cookies?.chorda_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

app.use('/api/songs', requireAuth);
```

### 5. Brute-Force Lockout (Exponential Backoff)

Beyond the rate limiter, track failed attempts per IP in memory:

```typescript
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkBruteForce(ip: string): { blocked: boolean; retryAfterSec?: number } {
  const entry = failedAttempts.get(ip);
  if (!entry) return { blocked: false };

  if (entry.lockedUntil > Date.now()) {
    const retryAfterSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { blocked: true, retryAfterSec };
  }

  return { blocked: false };
}

function recordFailedAttempt(ip: string) {
  const entry = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;

  // Exponential backoff: 2^count seconds, max 1 hour
  const lockoutSec = Math.min(Math.pow(2, entry.count), 3600);
  entry.lockedUntil = Date.now() + lockoutSec * 1000;

  failedAttempts.set(ip, entry);
}

function clearFailedAttempts(ip: string) {
  failedAttempts.delete(ip);
}
```

Lockout progression: 2s → 4s → 8s → 16s → 32s → 64s → 128s → ...up to 1 hour.

### 6. Download Rate Limit

Already covered in measure #2 (30 downloads per 10 minutes). Additionally, add a response header so clients know their remaining quota:

```typescript
// The express-rate-limit middleware already adds these headers:
// X-RateLimit-Limit: 30
// X-RateLimit-Remaining: 29
// X-RateLimit-Reset: <timestamp>
```

### 7. CORS Lockdown

```typescript
app.use(cors({
  origin: [
    'https://chorda.mabbason.com',
    'http://localhost:5173', // dev
  ],
  credentials: true, // needed for httpOnly cookies
}));
```

## Environment Variables (Server)

Add to `~/.bashrc` or use a `.env` file with pm2:

```bash
CHORDA_PASSPHRASE=<family-passphrase-here>
CHORDA_JWT_SECRET=<random-64-char-string>
```

Generate the JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## New Dependencies

```bash
cd ~/projects/chorda-api
npm install jsonwebtoken cookie-parser express-rate-limit
npm install -D @types/jsonwebtoken @types/cookie-parser
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `chorda-api/src/server.ts` | Modify | Add auth routes, middleware, rate limiting, CORS |
| `chorda-api/src/auth.ts` | Create | JWT helpers, brute-force tracking |
| `chorda/src/components/PassphraseGate.tsx` | Create | Passphrase prompt UI |
| `chorda/src/utils/auth.ts` | Create | `checkAuth()`, `submitPassphrase()` API calls |
| `chorda/src/App.tsx` | Modify | Wrap in `<PassphraseGate>` |
| `/etc/nginx/sites-available/chorda.mabbason.com` | Modify | Add rate limit zones |

## Testing Plan

- Unit tests: JWT sign/verify, brute-force lockout logic, rate limit config
- E2E tests: passphrase prompt visible, wrong passphrase rejected, correct passphrase grants access, session persists, API returns 401 without auth
- Manual: verify rate limiting works (hit endpoint rapidly), verify CORS blocks other origins

## Security Checklist Before Launch

- [ ] Set `CHORDA_PASSPHRASE` env var on server
- [ ] Set `CHORDA_JWT_SECRET` env var on server (random, 64+ chars)
- [ ] Verify httpOnly cookie is set with `secure: true`
- [ ] Verify CORS only allows chorda.mabbason.com + localhost
- [ ] Test brute-force lockout (5+ wrong attempts)
- [ ] Test Nginx rate limiting (rapid requests get 429)
- [ ] Verify unauthenticated API requests return 401
- [ ] Verify MIDI downloads are rate limited
