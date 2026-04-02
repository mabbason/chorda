import type { Song } from "../models/song";

const KEYBOARD_HEIGHT = 112;
const VIEWPORT_AHEAD_SEC = 4;
const VIEWPORT_BEHIND_SEC = 0.5; // less behind = notes land closer to keyboard

const RIGHT_HAND_COLOR = "#06b6d4";
const RIGHT_HAND_ACTIVE = "#22d3ee";
const LEFT_HAND_COLOR = "#22c55e";
const LEFT_HAND_ACTIVE = "#4ade80";
const UNKNOWN_HAND_COLOR = "#a855f7";

// Computed per-song: the actual MIDI range to display
interface KeyboardRange {
  lowest: number;
  highest: number;
  whiteKeyCount: number;
}

function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

function computeRange(song: Song): KeyboardRange {
  let lowest = 127;
  let highest = 0;
  for (const track of song.tracks) {
    for (const note of track.notes) {
      if (note.midi < lowest) lowest = note.midi;
      if (note.midi > highest) highest = note.midi;
    }
  }

  // Pad by 5 semitones on each side, snap to white key boundaries
  lowest = Math.max(21, lowest - 5);
  highest = Math.min(108, highest + 5);

  // Snap lowest down to nearest C, highest up to nearest B
  while (lowest % 12 !== 0 && lowest > 21) lowest--;
  while (highest % 12 !== 11 && highest < 108) highest++;

  let whiteKeyCount = 0;
  for (let m = lowest; m <= highest; m++) {
    if (!isBlackKey(m)) whiteKeyCount++;
  }

  return { lowest, highest, whiteKeyCount };
}

function getNoteColor(hand: string, active: boolean): string {
  if (active) {
    switch (hand) {
      case "right": return RIGHT_HAND_ACTIVE;
      case "left": return LEFT_HAND_ACTIVE;
      default: return UNKNOWN_HAND_COLOR;
    }
  }
  switch (hand) {
    case "right": return RIGHT_HAND_COLOR;
    case "left": return LEFT_HAND_COLOR;
    default: return UNKNOWN_HAND_COLOR;
  }
}

function getNoteX(midi: number, canvasWidth: number, range: KeyboardRange): { x: number; width: number } {
  const whiteKeyWidth = canvasWidth / range.whiteKeyCount;
  const blackKeyWidth = whiteKeyWidth * 0.65;

  let whiteIndex = 0;
  for (let m = range.lowest; m < midi; m++) {
    if (!isBlackKey(m)) whiteIndex++;
  }

  if (isBlackKey(midi)) {
    return { x: whiteIndex * whiteKeyWidth - blackKeyWidth / 2, width: blackKeyWidth };
  }
  return { x: whiteIndex * whiteKeyWidth, width: whiteKeyWidth };
}

function drawKeyboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  range: KeyboardRange,
  activeNotes: Map<number, string> // midi -> hand color
) {
  const keyboardY = height - KEYBOARD_HEIGHT;
  const whiteKeyWidth = width / range.whiteKeyCount;
  const blackKeyWidth = whiteKeyWidth * 0.65;
  const blackKeyHeight = KEYBOARD_HEIGHT * 0.6;

  // Draw white keys
  let whiteIndex = 0;
  for (let m = range.lowest; m <= range.highest; m++) {
    if (isBlackKey(m)) continue;
    const x = whiteIndex * whiteKeyWidth;
    const isActive = activeNotes.has(m);

    if (isActive) {
      const handColor = activeNotes.get(m)!;
      // Draw white key base first
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, keyboardY, whiteKeyWidth - 1, KEYBOARD_HEIGHT);
      // Subtle color wash over entire key
      ctx.fillStyle = handColor;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x, keyboardY, whiteKeyWidth - 1, KEYBOARD_HEIGHT);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, keyboardY, whiteKeyWidth - 1, KEYBOARD_HEIGHT);
    }

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, keyboardY, whiteKeyWidth - 1, KEYBOARD_HEIGHT);

    // Draw note name on wider keys
    if (whiteKeyWidth > 18) {
      ctx.fillStyle = isActive ? "#0f172a" : "#94a3b8";
      ctx.font = `${Math.min(10, whiteKeyWidth * 0.4)}px system-ui`;
      ctx.textAlign = "center";
      const names = ["C", "", "D", "", "E", "F", "", "G", "", "A", "", "B"];
      const noteName = names[m % 12];
      if (noteName) {
        ctx.fillText(noteName, Math.round(x + whiteKeyWidth / 2), height - 8);
      }
    }

    whiteIndex++;
  }

  // Draw black keys
  whiteIndex = 0;
  for (let m = range.lowest; m <= range.highest; m++) {
    if (!isBlackKey(m)) {
      whiteIndex++;
      continue;
    }
    const x = whiteIndex * whiteKeyWidth - blackKeyWidth / 2;
    const isActive = activeNotes.has(m);

    if (isActive) {
      const handColor = activeNotes.get(m)!;
      // Draw dark key base
      ctx.fillStyle = "#334155";
      ctx.fillRect(x, keyboardY, blackKeyWidth, blackKeyHeight);
      // Subtle color wash
      ctx.fillStyle = handColor;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, keyboardY, blackKeyWidth, blackKeyHeight);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x, keyboardY, blackKeyWidth, blackKeyHeight);
    }
  }

  // Top border of keyboard
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, keyboardY);
  ctx.lineTo(width, keyboardY);
  ctx.stroke();
}

function drawPlayLine(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const y = height - KEYBOARD_HEIGHT;
  // Glow effect
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
}

function drawSectionDividers(
  ctx: CanvasRenderingContext2D,
  width: number,
  waterfallHeight: number,
  song: Song,
  currentTimeSec: number,
  pixelsPerSec: number
) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;

  for (const measure of song.measures) {
    if (measure.index % 4 !== 0) continue;
    const timeDelta = measure.startSec - currentTimeSec;
    if (timeDelta < -VIEWPORT_BEHIND_SEC || timeDelta > VIEWPORT_AHEAD_SEC) continue;

    const y = waterfallHeight - (timeDelta + VIEWPORT_BEHIND_SEC) * pixelsPerSec;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

// Cached per song
let cachedRange: KeyboardRange | null = null;
let cachedSongTitle: string = "";

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  song: Song,
  currentTimeSec: number,
  visibleHands: Set<string>
) {
  const { width, height } = canvas;

  // Cache keyboard range per song
  if (!cachedRange || cachedSongTitle !== song.title) {
    cachedRange = computeRange(song);
    cachedSongTitle = song.title;
  }
  const range = cachedRange;

  // Clear
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  const waterfallHeight = height - KEYBOARD_HEIGHT;
  const pixelsPerSec = waterfallHeight / (VIEWPORT_AHEAD_SEC + VIEWPORT_BEHIND_SEC);
  const viewStart = currentTimeSec - VIEWPORT_BEHIND_SEC;
  const viewEnd = currentTimeSec + VIEWPORT_AHEAD_SEC;

  // Active notes: midi -> hand color (for keyboard highlighting)
  const activeNotes = new Map<number, string>();

  // Draw section dividers
  drawSectionDividers(ctx, width, waterfallHeight, song, currentTimeSec, pixelsPerSec);

  // Clip waterfall to above the keyboard (notes must not bleed into keys)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, waterfallHeight);
  ctx.clip();

  // Draw falling notes (viewport culled)
  for (const track of song.tracks) {
    if (!visibleHands.has(track.hand) && track.hand !== "unknown") continue;

    for (const note of track.notes) {
      const noteEnd = note.startSec + note.durationSec;
      if (noteEnd < viewStart || note.startSec > viewEnd) continue;

      const isActive = note.startSec <= currentTimeSec && noteEnd > currentTimeSec;
      if (isActive) {
        activeNotes.set(note.midi, getNoteColor(track.hand, false));
      }

      const { x, width: noteWidth } = getNoteX(note.midi, width, range);
      const noteTopTimeDelta = noteEnd - currentTimeSec;
      const noteBottomTimeDelta = note.startSec - currentTimeSec;

      const noteTopY = waterfallHeight - (noteTopTimeDelta + VIEWPORT_BEHIND_SEC) * pixelsPerSec;
      const noteBottomY = waterfallHeight - (noteBottomTimeDelta + VIEWPORT_BEHIND_SEC) * pixelsPerSec;
      const noteHeight = Math.max(noteBottomY - noteTopY, 4);

      const color = getNoteColor(track.hand, isActive);
      const noteX = Math.round(x + 1);
      const noteW = Math.round(noteWidth - 2);

      // Active note glow
      if (isActive) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }

      // Draw note bar with rounded corners
      ctx.fillStyle = color;
      ctx.globalAlpha = isActive ? 1.0 : 0.6;
      ctx.beginPath();
      const radius = Math.min(3, noteHeight / 2);
      ctx.roundRect(noteX, Math.round(noteTopY), noteW, Math.round(noteHeight), radius);
      ctx.fill();

      // White border on active notes
      if (isActive) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Note name label
      if (noteHeight > 16 && noteW > 12) {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.min(11, noteW * 0.45)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(note.name, Math.round(x + noteWidth / 2), Math.round(noteTopY + 13));
      }

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }
  }

  // Restore clipping (waterfall area only -> full canvas)
  ctx.restore();

  // Draw play line
  drawPlayLine(ctx, width, height);

  // Draw keyboard
  drawKeyboard(ctx, width, height, range, activeNotes);
}
