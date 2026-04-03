import type { Song } from "../models/song";

// Keep in sync with brand palette in src/index.css @theme
const STAFF_LINE_COLOR = "#5c6577";    // n-600
const NOTE_COLOR = "#dfe3ea";          // n-200
const ACTIVE_NOTE_COLOR = "#b48ffa";   // purple-light
const RIGHT_HAND_NOTE = "#9768f8";     // purple-base
const LEFT_HAND_NOTE = "#8ec56f";      // brand-green-base
const CURSOR_COLOR = "#fdd63b";        // yellow-base
const LEDGER_LINE_COLOR = "#7d8799";   // n-500

const STAFF_LINES = 5;
const STAFF_GAP = 8; // pixels between staff lines
const TREBLE_BASS_GAP = 28; // gap between treble and bass staves
const NOTE_HEAD_RX = 5; // note head horizontal radius
const NOTE_HEAD_RY = 3.5; // note head vertical radius
const MEASURES_VISIBLE = 4; // how many measures to show

// Map MIDI note to staff position (semitones from middle C = 60)
// Treble clef: middle C is on first ledger line below staff
// Bass clef: middle C is on first ledger line above staff
// Staff position 0 = middle C, positive = up, negative = down
// Each position = one diatonic step (white key)

const PITCH_TO_DIATONIC: Record<number, number> = {};
// Build lookup: MIDI note -> diatonic position relative to C4 (MIDI 60)
(() => {
  // Diatonic scale pattern within an octave: C=0, D=1, E=2, F=3, G=4, A=5, B=6
  const chromaticToDiatonic = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  // Sharp/flat: which chromatic notes are "sharps"
  for (let midi = 21; midi <= 108; midi++) {
    const octave = Math.floor(midi / 12) - 1;
    const pitchClass = midi % 12;
    const diatonicInOctave = chromaticToDiatonic[pitchClass];
    // Diatonic position relative to C4 (MIDI 60)
    const c4Octave = 4;
    PITCH_TO_DIATONIC[midi] = (octave - c4Octave) * 7 + diatonicInOctave;
  }
})();

function isSharp(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

function getDiatonicPosition(midi: number): number {
  return PITCH_TO_DIATONIC[midi] ?? 0;
}

interface NotationLayout {
  staffTop: number;
  trebleTopLine: number; // Y of top treble staff line
  bassTopLine: number; // Y of top bass staff line
  staffHeight: number;
  halfStep: number; // pixels per diatonic half-step
}

function computeLayout(height: number): NotationLayout {
  const padding = 12;
  const staffHeight = (STAFF_LINES - 1) * STAFF_GAP;
  const totalHeight = staffHeight * 2 + TREBLE_BASS_GAP;
  const staffTop = padding;
  const trebleTopLine = staffTop + (height - totalHeight) / 2;
  const bassTopLine = trebleTopLine + staffHeight + TREBLE_BASS_GAP;
  const halfStep = STAFF_GAP / 2;

  return { staffTop, trebleTopLine, bassTopLine, staffHeight, halfStep };
}

function drawStaffLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  topY: number
) {
  ctx.strokeStyle = STAFF_LINE_COLOR;
  ctx.lineWidth = 1;
  for (let i = 0; i < STAFF_LINES; i++) {
    const y = Math.round(topY + i * STAFF_GAP) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }
}

function drawClef(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  clef: "treble" | "bass"
) {
  ctx.fillStyle = NOTE_COLOR;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "center";

  if (clef === "treble") {
    // Treble clef symbol (simplified)
    ctx.font = "28px serif";
    ctx.fillText("\u{1D11E}", x, topY + STAFF_GAP * 3.5);
  } else {
    // Bass clef symbol (simplified)
    ctx.font = "22px serif";
    ctx.fillText("\u{1D122}", x, topY + STAFF_GAP * 1.5);
  }
}

function noteY(
  diatonicPos: number,
  layout: NotationLayout,
  clef: "treble" | "bass"
): number {
  if (clef === "treble") {
    // Treble clef: top line is F5 (diatonic 10), bottom line is E4 (diatonic 2)
    // Position relative to bottom line E4 (diatonic pos 2)
    const bottomLinePos = 2; // E4
    return layout.trebleTopLine + (STAFF_LINES - 1) * STAFF_GAP - (diatonicPos - bottomLinePos) * layout.halfStep;
  } else {
    // Bass clef: top line is A3 (diatonic -2), bottom line is G2 (diatonic -9)
    // Wait, let's recalculate. Bass clef bottom line = G2 (MIDI 43, diatonic -9+7=-2... hmm)
    // Actually: C4=0, B3=-1, A3=-2, G3=-3, F3=-4, E3=-5, D3=-6, C3=-7
    // Bass top line = A3 = -2, bottom line = G2 = -9
    const bottomLinePos = -9; // G2
    return layout.bassTopLine + (STAFF_LINES - 1) * STAFF_GAP - (diatonicPos - bottomLinePos) * layout.halfStep;
  }
}

function drawLedgerLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  diatonicPos: number,
  layout: NotationLayout,
  clef: "treble" | "bass"
) {
  ctx.strokeStyle = LEDGER_LINE_COLOR;
  ctx.lineWidth = 1;
  const w = NOTE_HEAD_RX * 2.5;

  if (clef === "treble") {
    // Below treble staff: E4 is bottom line (pos 2), need ledger at C4 (pos 0)
    if (diatonicPos <= 0) {
      for (let p = 0; p >= diatonicPos; p -= 2) {
        const y = noteY(p, layout, "treble");
        ctx.beginPath();
        ctx.moveTo(x - w, Math.round(y) + 0.5);
        ctx.lineTo(x + w, Math.round(y) + 0.5);
        ctx.stroke();
      }
    }
    // Above treble staff: F5 is top line (pos 10)
    if (diatonicPos >= 12) {
      for (let p = 12; p <= diatonicPos; p += 2) {
        const y = noteY(p, layout, "treble");
        ctx.beginPath();
        ctx.moveTo(x - w, Math.round(y) + 0.5);
        ctx.lineTo(x + w, Math.round(y) + 0.5);
        ctx.stroke();
      }
    }
  } else {
    // Above bass staff: A3 is top line (pos -2), need ledger at C4 (pos 0)
    if (diatonicPos >= 0) {
      for (let p = 0; p <= diatonicPos; p += 2) {
        const y = noteY(p, layout, "bass");
        ctx.beginPath();
        ctx.moveTo(x - w, Math.round(y) + 0.5);
        ctx.lineTo(x + w, Math.round(y) + 0.5);
        ctx.stroke();
      }
    }
    // Below bass staff: G2 is bottom line (pos -9)
    if (diatonicPos <= -11) {
      for (let p = -11; p >= diatonicPos; p -= 2) {
        const y = noteY(p, layout, "bass");
        ctx.beginPath();
        ctx.moveTo(x - w, Math.round(y) + 0.5);
        ctx.lineTo(x + w, Math.round(y) + 0.5);
        ctx.stroke();
      }
    }
  }
}

function drawNoteHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  filled: boolean
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, NOTE_HEAD_RX, NOTE_HEAD_RY, -0.2, 0, Math.PI * 2);
  if (filled) {
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawSharpSign(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = NOTE_COLOR;
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("#", x - NOTE_HEAD_RX - 6, y + 3);
}

export function renderNotation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  song: Song,
  currentTimeSec: number,
  visibleHands: Set<string>
) {
  // Clear
  ctx.fillStyle = "#272e3b";
  ctx.fillRect(0, 0, width, height);

  const layout = computeLayout(height);
  const clefWidth = 30;
  const staffWidth = width - clefWidth - 10;

  // Draw staff lines
  drawStaffLines(ctx, clefWidth, staffWidth, layout.trebleTopLine);
  drawStaffLines(ctx, clefWidth, staffWidth, layout.bassTopLine);

  // Draw clefs
  drawClef(ctx, clefWidth / 2 + 2, layout.trebleTopLine, "treble");
  drawClef(ctx, clefWidth / 2 + 2, layout.bassTopLine, "bass");

  // Find which measures to show (centered on current time)
  if (song.measures.length === 0) return;

  let currentMeasureIdx = 0;
  for (let i = 0; i < song.measures.length; i++) {
    if (currentTimeSec < song.measures[i].endSec) {
      currentMeasureIdx = i;
      break;
    }
    if (i === song.measures.length - 1) currentMeasureIdx = i;
  }

  const startMeasure = Math.max(0, currentMeasureIdx - 1);
  const endMeasure = Math.min(song.measures.length - 1, startMeasure + MEASURES_VISIBLE - 1);
  const visibleMeasures = song.measures.slice(startMeasure, endMeasure + 1);

  if (visibleMeasures.length === 0) return;

  const timeStart = visibleMeasures[0].startSec;
  const timeEnd = visibleMeasures[visibleMeasures.length - 1].endSec;
  const timeSpan = timeEnd - timeStart;
  if (timeSpan <= 0) return;

  const noteAreaStart = clefWidth + 8;
  const noteAreaWidth = staffWidth - 8;

  function timeToX(t: number): number {
    return noteAreaStart + ((t - timeStart) / timeSpan) * noteAreaWidth;
  }

  // Draw measure bar lines
  ctx.strokeStyle = STAFF_LINE_COLOR;
  ctx.lineWidth = 1;
  for (const measure of visibleMeasures) {
    const x = Math.round(timeToX(measure.startSec)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, layout.trebleTopLine);
    ctx.lineTo(x, layout.trebleTopLine + (STAFF_LINES - 1) * STAFF_GAP);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, layout.bassTopLine);
    ctx.lineTo(x, layout.bassTopLine + (STAFF_LINES - 1) * STAFF_GAP);
    ctx.stroke();
  }
  // End bar line
  const endX = Math.round(timeToX(timeEnd)) + 0.5;
  ctx.beginPath();
  ctx.moveTo(endX, layout.trebleTopLine);
  ctx.lineTo(endX, layout.trebleTopLine + (STAFF_LINES - 1) * STAFF_GAP);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, layout.bassTopLine);
  ctx.lineTo(endX, layout.bassTopLine + (STAFF_LINES - 1) * STAFF_GAP);
  ctx.stroke();

  // Draw notes
  for (const track of song.tracks) {
    if (!visibleHands.has(track.hand) && track.hand !== "unknown") continue;
    const handColor = track.hand === "right" ? RIGHT_HAND_NOTE : LEFT_HAND_NOTE;
    const clef = track.hand === "left" ? "bass" : "treble";

    for (const note of track.notes) {
      if (note.startSec > timeEnd || note.startSec + note.durationSec < timeStart) continue;

      const x = timeToX(note.startSec);
      const dPos = getDiatonicPosition(note.midi);
      const y = noteY(dPos, layout, clef);

      const isActive = note.startSec <= currentTimeSec && note.startSec + note.durationSec > currentTimeSec;
      const color = isActive ? ACTIVE_NOTE_COLOR : handColor;

      // Draw ledger lines if needed
      drawLedgerLines(ctx, x, dPos, layout, clef);

      // Draw sharp sign
      if (isSharp(note.midi)) {
        drawSharpSign(ctx, x, y);
      }

      // Filled note for quarter and shorter, open for half and longer
      const filled = note.durationSec < (60 / (song.tempos[0]?.bpm ?? 120));
      drawNoteHead(ctx, x, y, color, filled);

      // Active note glow
      if (isActive) {
        ctx.shadowColor = ACTIVE_NOTE_COLOR;
        ctx.shadowBlur = 6;
        drawNoteHead(ctx, x, y, color, filled);
        ctx.shadowBlur = 0;
      }
    }
  }

  // Draw playback cursor
  if (currentTimeSec >= timeStart && currentTimeSec <= timeEnd) {
    const cursorX = Math.round(timeToX(currentTimeSec)) + 0.5;
    ctx.strokeStyle = CURSOR_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cursorX, layout.trebleTopLine - 4);
    ctx.lineTo(cursorX, layout.bassTopLine + (STAFF_LINES - 1) * STAFF_GAP + 4);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Measure numbers
  ctx.fillStyle = "#7d8799";
  ctx.font = "9px system-ui";
  ctx.textAlign = "center";
  for (const measure of visibleMeasures) {
    const x = timeToX(measure.startSec) + 10;
    ctx.fillText(`${measure.index + 1}`, x, layout.trebleTopLine - 4);
  }
}
