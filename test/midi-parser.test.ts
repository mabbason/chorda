import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseMidi } from "../src/parsers/midi-parser";

const FIXTURE_PATH = join(__dirname, "fixtures/test-c-major-scale.mid");

describe("MIDI Parser", () => {
  const buffer = readFileSync(FIXTURE_PATH);
  const song = parseMidi(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  it("parses song title", () => {
    expect(song.title).toBe("Test - C Major Scale");
  });

  it("extracts correct number of tracks", () => {
    // 2 tracks (right + left hand)
    expect(song.tracks.length).toBe(2);
  });

  it("parses right hand notes correctly", () => {
    const rightTrack = song.tracks.find((t) => t.hand === "right");
    expect(rightTrack).toBeDefined();
    expect(rightTrack!.notes.length).toBe(8);

    // First note should be C4 (MIDI 60)
    expect(rightTrack!.notes[0].midi).toBe(60);
    expect(rightTrack!.notes[0].name).toBe("C4");
    expect(rightTrack!.notes[0].startSec).toBeCloseTo(0, 1);
    expect(rightTrack!.notes[0].durationSec).toBeCloseTo(0.45, 1);

    // Last note should be C5 (MIDI 72)
    expect(rightTrack!.notes[7].midi).toBe(72);
    expect(rightTrack!.notes[7].name).toBe("C5");
  });

  it("parses left hand notes correctly", () => {
    const leftTrack = song.tracks.find((t) => t.hand === "left");
    expect(leftTrack).toBeDefined();
    expect(leftTrack!.notes.length).toBe(6);

    // First note should be C3 (MIDI 48)
    expect(leftTrack!.notes[0].midi).toBe(48);
  });

  it("assigns hands via track order (piano tracks)", () => {
    expect(song.tracks[0].hand).toBe("right");
    expect(song.tracks[1].hand).toBe("left");
  });

  it("stores instrument info on tracks", () => {
    expect(song.tracks[0].programNumber).toBe(0); // Acoustic Grand Piano
    expect(song.tracks[1].programNumber).toBe(0);
  });

  it("extracts tempo", () => {
    expect(song.tempos.length).toBeGreaterThan(0);
    expect(song.tempos[0].bpm).toBeCloseTo(120, 0);
  });

  it("computes song duration", () => {
    expect(song.durationSec).toBeCloseTo(4, 0);
  });

  it("generates measures", () => {
    expect(song.measures.length).toBeGreaterThan(0);
    // At 120 BPM, 4/4 time: each measure is 2 seconds
    expect(song.measures[0].startSec).toBeCloseTo(0, 1);
    expect(song.measures[0].endSec).toBeCloseTo(2, 1);
  });

  it("assigns notes to measures", () => {
    const rightTrack = song.tracks.find((t) => t.hand === "right")!;
    // First 4 notes (0-1.5s) should be in measure 0
    expect(rightTrack.notes[0].measure).toBe(0);
    expect(rightTrack.notes[3].measure).toBe(0);
    // Notes 4-7 (2-3.5s) should be in measure 1
    expect(rightTrack.notes[4].measure).toBe(1);
  });

  it("uses seconds, not milliseconds", () => {
    const rightTrack = song.tracks.find((t) => t.hand === "right")!;
    // If times were in ms, the first note's start would be > 100
    expect(rightTrack.notes[0].startSec).toBeLessThan(1);
    expect(song.durationSec).toBeLessThan(100);
  });
});
