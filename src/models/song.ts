// All times in SECONDS (matches @tonejs/midi and Tone.Transport.seconds)

export interface Song {
  title: string;
  tempos: TempoEvent[];
  timeSignatures: TimeSignatureEvent[];
  durationSec: number;
  measures: Measure[];
  tracks: Track[];
}

export interface TempoEvent {
  bpm: number;
  timeSec: number;
}

export interface TimeSignatureEvent {
  numerator: number;
  denominator: number;
  timeSec: number;
}

export interface Measure {
  index: number;
  startSec: number;
  endSec: number;
}

export interface Track {
  name: string;
  channel: number;
  instrument: string;
  programNumber: number;
  hand: "left" | "right" | "unknown";
  notes: Note[];
}

export interface Note {
  midi: number;
  name: string;
  startSec: number;
  durationSec: number;
  velocity: number;
  measure: number;
}
