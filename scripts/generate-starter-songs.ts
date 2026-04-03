// Generates simple beginner MIDI files for songs that are hard to find as clean piano MIDIs
// Run with: npx tsx scripts/generate-starter-songs.ts

import { writeFileSync } from "fs";
import { join } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Midi } = require("@tonejs/midi");

const OUT_DIR = join(import.meta.dirname, "../public/songs");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveMidi(midi: any, filename: string) {
  writeFileSync(join(OUT_DIR, filename), Buffer.from(midi.toArray()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = midi.tracks.reduce((s: number, t: any) => s + t.notes.length, 0);
  console.log(`${filename}: ${midi.duration.toFixed(1)}s, ${notes} notes`);
}

// ─── Twinkle Twinkle Little Star ───────────────────────────────
function generateTwinkleTwinkle() {
  const midi = new Midi();
  midi.name = "Twinkle Twinkle Little Star";
  midi.header.setTempo(100);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 });

  const rh = midi.addTrack();
  rh.name = "Right Hand";
  rh.channel = 0;
  rh.instrument.number = 0;

  const lh = midi.addTrack();
  lh.name = "Left Hand";
  lh.channel = 1;
  lh.instrument.number = 0;

  const q = 0.6; // quarter note at 100bpm
  const h = q * 2; // half note

  // Full melody with proper timing
  const phrases: [number, number][][] = [
    // "Twinkle twinkle little star"
    [[60,q],[60,q],[67,q],[67,q],[69,q],[69,q],[67,h]],
    // "How I wonder what you are"
    [[65,q],[65,q],[64,q],[64,q],[62,q],[62,q],[60,h]],
    // "Up above the world so high"
    [[67,q],[67,q],[65,q],[65,q],[64,q],[64,q],[62,h]],
    // "Like a diamond in the sky"
    [[67,q],[67,q],[65,q],[65,q],[64,q],[64,q],[62,h]],
    // "Twinkle twinkle little star"
    [[60,q],[60,q],[67,q],[67,q],[69,q],[69,q],[67,h]],
    // "How I wonder what you are"
    [[65,q],[65,q],[64,q],[64,q],[62,q],[62,q],[60,h]],
  ];

  let t = 0;
  for (const phrase of phrases) {
    for (const [note, dur] of phrase) {
      rh.addNote({ midi: note, time: t, duration: dur * 0.9, velocity: 0.7 });
      t += dur;
    }
  }

  // Left hand: whole note bass + fifth
  const chordProgression: [number[], number][] = [
    [[48, 55], h * 2], // C (m1)
    [[48, 55], h * 2], // C (m2)
    [[53, 57], h * 2], // F (m3)
    [[48, 55], h * 2], // C (m4)
    [[48, 55], h * 2], // C (m5)
    [[55, 59], h * 2], // G (m6)
    [[48, 55], h * 2], // C (m7)
    [[55, 59], h * 2], // G (m8)
    [[48, 55], h * 2], // C (m9)
    [[55, 59], h * 2], // G (m10)
    [[48, 55], h * 2], // C (m11)
    [[53, 57], h * 2], // F (m12)
  ];

  let lt = 0;
  for (const [notes, dur] of chordProgression) {
    for (const n of notes) {
      lh.addNote({ midi: n, time: lt, duration: dur * 0.95, velocity: 0.4 });
    }
    lt += dur;
  }

  saveMidi(midi, "twinkle-twinkle.mid");
}

// ─── Mary Had a Little Lamb ───────────────────────────────────
function generateMaryLamb() {
  const midi = new Midi();
  midi.name = "Mary Had a Little Lamb";
  midi.header.setTempo(120);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 });

  const rh = midi.addTrack();
  rh.name = "Right Hand";
  rh.channel = 0;
  rh.instrument.number = 0;

  const lh = midi.addTrack();
  lh.name = "Left Hand";
  lh.channel = 1;
  lh.instrument.number = 0;

  const q = 0.5; // quarter at 120bpm
  const h = q * 2;
  const w = q * 4;

  // Melody
  const notes: [number, number][] = [
    // "Mary had a little lamb"
    [64,q],[62,q],[60,q],[62,q],[64,q],[64,q],[64,h],
    // "Little lamb, little lamb"
    [62,q],[62,q],[62,h],[64,q],[67,q],[67,h],
    // "Mary had a little lamb"
    [64,q],[62,q],[60,q],[62,q],[64,q],[64,q],[64,q],[64,q],
    // "Its fleece was white as snow"
    [62,q],[62,q],[64,q],[62,q],[60,w],
  ];

  let t = 0;
  for (const [note, dur] of notes) {
    rh.addNote({ midi: note, time: t, duration: dur * 0.9, velocity: 0.7 });
    t += dur;
  }

  // Left hand: half note bass
  const bass: [number, number][] = [
    [48,h],[48,h],[48,h],[48,h],    // C (m1-2)
    [55,h],[55,h],[48,h],[48,h],    // G C (m3-4)
    [48,h],[48,h],[48,h],[48,h],    // C (m5-6)
    [55,h],[55,h],[48,w],           // G C (m7-8)
  ];

  let bt = 0;
  for (const [note, dur] of bass) {
    lh.addNote({ midi: note, time: bt, duration: dur * 0.9, velocity: 0.4 });
    bt += dur;
  }

  saveMidi(midi, "mary-had-a-little-lamb.mid");
}

// ─── Ode to Joy ──────────────────────────────────────────────
function generateOdeToJoy() {
  const midi = new Midi();
  midi.name = "Ode to Joy";
  midi.header.setTempo(108);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 });

  const rh = midi.addTrack();
  rh.name = "Right Hand";
  rh.channel = 0;
  rh.instrument.number = 0;

  const lh = midi.addTrack();
  lh.name = "Left Hand";
  lh.channel = 1;
  lh.instrument.number = 0;

  const q = 60 / 108; // quarter note
  const h = q * 2;
  const dq = q * 1.5; // dotted quarter
  const e = q * 0.5; // eighth

  // Main theme (two phrases)
  const melody: [number, number][] = [
    // Phrase 1: E E F G | G F E D | C C D E | E. D D
    [64,q],[64,q],[65,q],[67,q],
    [67,q],[65,q],[64,q],[62,q],
    [60,q],[60,q],[62,q],[64,q],
    [64,dq],[62,e],[62,h],
    // Phrase 2: E E F G | G F E D | C C D E | D. C C
    [64,q],[64,q],[65,q],[67,q],
    [67,q],[65,q],[64,q],[62,q],
    [60,q],[60,q],[62,q],[64,q],
    [62,dq],[60,e],[60,h],
  ];

  let t = 0;
  for (const [note, dur] of melody) {
    rh.addNote({ midi: note, time: t, duration: dur * 0.9, velocity: 0.7 });
    t += dur;
  }

  // Left hand: half note bass
  const bass: [number, number][] = [
    [48,h],[55,h],  // C G
    [48,h],[55,h],  // C G
    [53,h],[48,h],  // F C
    [55,h],[55,h],  // G G
    [48,h],[55,h],
    [48,h],[55,h],
    [53,h],[48,h],
    [55,h],[48,h],
  ];

  let bt = 0;
  for (const [note, dur] of bass) {
    lh.addNote({ midi: note, time: bt, duration: dur * 0.9, velocity: 0.4 });
    bt += dur;
  }

  saveMidi(midi, "ode-to-joy.mid");
}

generateTwinkleTwinkle();
generateMaryLamb();
generateOdeToJoy();

console.log("\nStarter songs generated!");
