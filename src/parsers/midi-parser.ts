import { Midi } from "@tonejs/midi";
import type { Song, Track, Note, Measure, TempoEvent, TimeSignatureEvent } from "../models/song";

const DRUM_CHANNEL = 9;
const PIANO_PROGRAMS = [0, 1, 2, 3, 4, 5, 6, 7]; // Acoustic/electric pianos, harpsichord, clavinet

function midiNoteToName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = names[midi % 12];
  return `${note}${octave}`;
}

function assignHands(tracks: Track[]): Track[] {
  // Filter out drum tracks
  const nonDrumTracks = tracks.filter((t) => t.channel !== DRUM_CHANNEL);
  if (nonDrumTracks.length === 0) return tracks;

  // Prefer piano tracks
  const pianoTracks = nonDrumTracks.filter((t) => PIANO_PROGRAMS.includes(t.programNumber));
  const targetTracks = pianoTracks.length > 0 ? pianoTracks : nonDrumTracks;

  if (targetTracks.length >= 2) {
    // Assign by average pitch: higher average = right hand, lower = left hand
    const avgPitch = (t: Track) => {
      if (t.notes.length === 0) return 60;
      return t.notes.reduce((sum, n) => sum + n.midi, 0) / t.notes.length;
    };
    const avg0 = avgPitch(targetTracks[0]);
    const avg1 = avgPitch(targetTracks[1]);

    if (avg0 >= avg1) {
      targetTracks[0].hand = "right";
      targetTracks[1].hand = "left";
    } else {
      targetTracks[0].hand = "left";
      targetTracks[1].hand = "right";
    }
  } else if (targetTracks.length === 1) {
    // Single track: split at middle C (MIDI 60)
    const track = targetTracks[0];
    const rightNotes: Note[] = [];
    const leftNotes: Note[] = [];

    for (const note of track.notes) {
      if (note.midi >= 60) {
        rightNotes.push(note);
      } else {
        leftNotes.push(note);
      }
    }

    track.hand = "right";
    track.notes = rightNotes;

    // Create a left hand track from the split
    const leftTrack: Track = {
      ...track,
      name: `${track.name} (Left Hand)`,
      hand: "left",
      notes: leftNotes,
    };
    tracks.push(leftTrack);
  }

  return tracks;
}

function buildMeasures(
  durationSec: number,
  tempos: TempoEvent[],
  timeSignatures: TimeSignatureEvent[]
): Measure[] {
  const measures: Measure[] = [];
  const ts = timeSignatures[0] || { numerator: 4, denominator: 4, timeSec: 0 };
  const beatsPerMeasure = ts.numerator;

  let currentTime = 0;
  let measureIndex = 0;

  while (currentTime < durationSec) {
    // Find the active tempo at this time
    let activeBpm = 120; // default
    for (const tempo of tempos) {
      if (tempo.timeSec <= currentTime) {
        activeBpm = tempo.bpm;
      }
    }

    const beatDuration = 60 / activeBpm;
    const measureDuration = beatDuration * beatsPerMeasure;
    const endTime = Math.min(currentTime + measureDuration, durationSec);

    measures.push({
      index: measureIndex,
      startSec: currentTime,
      endSec: endTime,
    });

    currentTime = endTime;
    measureIndex++;
  }

  return measures;
}

function assignNotesToMeasures(notes: Note[], measures: Measure[]): void {
  for (const note of notes) {
    // Binary search would be faster but linear is fine for typical song sizes
    for (let i = measures.length - 1; i >= 0; i--) {
      if (note.startSec >= measures[i].startSec) {
        note.measure = measures[i].index;
        break;
      }
    }
  }
}

export function parseMidi(arrayBuffer: ArrayBuffer): Song {
  const midi = new Midi(arrayBuffer);

  const tempos: TempoEvent[] = midi.header.tempos.map((t) => ({
    bpm: t.bpm,
    timeSec: t.ticks ? midi.header.ticksToSeconds(t.ticks) : 0,
  }));

  const timeSignatures: TimeSignatureEvent[] = midi.header.timeSignatures.map((ts) => ({
    numerator: ts.timeSignature[0],
    denominator: ts.timeSignature[1],
    timeSec: ts.ticks ? midi.header.ticksToSeconds(ts.ticks) : 0,
  }));

  // Default tempo if none specified
  if (tempos.length === 0) {
    tempos.push({ bpm: 120, timeSec: 0 });
  }
  if (timeSignatures.length === 0) {
    timeSignatures.push({ numerator: 4, denominator: 4, timeSec: 0 });
  }

  let tracks: Track[] = midi.tracks
    .filter((t) => t.notes.length > 0)
    .map((t, i) => ({
      name: t.name || `Track ${i + 1}`,
      channel: t.channel ?? i,
      instrument: t.instrument?.name || "Unknown",
      programNumber: t.instrument?.number ?? 0,
      hand: "unknown" as const,
      notes: t.notes.map((n) => ({
        midi: n.midi,
        name: midiNoteToName(n.midi),
        startSec: n.time,
        durationSec: n.duration,
        velocity: Math.round(n.velocity * 127),
        measure: 0,
      })),
    }));

  tracks = assignHands(tracks);

  const durationSec = midi.duration;
  const measures = buildMeasures(durationSec, tempos, timeSignatures);

  // Assign notes to measures
  for (const track of tracks) {
    assignNotesToMeasures(track.notes, measures);
  }

  return {
    title: midi.name || "Untitled",
    tempos,
    timeSignatures,
    durationSec,
    measures,
    tracks,
  };
}
