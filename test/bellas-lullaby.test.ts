import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseMidi } from "../src/parsers/midi-parser";

const FIXTURE_PATH = join(__dirname, "fixtures/bellas-lullaby.mid");

describe("Bella's Lullaby MIDI", () => {
  const buffer = readFileSync(FIXTURE_PATH);
  const song = parseMidi(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  it("parses without errors", () => {
    expect(song).toBeDefined();
    expect(song.title).toBeTruthy();
  });

  it("has tracks with notes", () => {
    const tracksWithNotes = song.tracks.filter(t => t.notes.length > 0);
    expect(tracksWithNotes.length).toBeGreaterThan(0);
    console.log(`Title: ${song.title}`);
    console.log(`Tracks: ${song.tracks.length}`);
    song.tracks.forEach((t, i) => {
      console.log(`  Track ${i}: "${t.name}" ch=${t.channel} prog=${t.programNumber} hand=${t.hand} notes=${t.notes.length}`);
    });
    console.log(`Duration: ${song.durationSec.toFixed(1)}s`);
    console.log(`Measures: ${song.measures.length}`);
    console.log(`Tempos: ${song.tempos.map(t => `${t.bpm}bpm@${t.timeSec.toFixed(1)}s`).join(', ')}`);
    console.log(`Note range: MIDI ${Math.min(...song.tracks.flatMap(t => t.notes.map(n => n.midi)))} - ${Math.max(...song.tracks.flatMap(t => t.notes.map(n => n.midi)))}`);
  });

  it("assigns hands", () => {
    const hands = new Set(song.tracks.map(t => t.hand));
    console.log(`Hands assigned: ${[...hands].join(', ')}`);
    // Should have at least one non-unknown hand
    expect(hands.size).toBeGreaterThan(0);
  });

  it("has reasonable duration", () => {
    expect(song.durationSec).toBeGreaterThan(10);
    expect(song.durationSec).toBeLessThan(600); // under 10 minutes
  });

  it("generates measures", () => {
    expect(song.measures.length).toBeGreaterThan(0);
    // Measures should cover the song duration
    const lastMeasure = song.measures[song.measures.length - 1];
    expect(lastMeasure.endSec).toBeCloseTo(song.durationSec, 0);
  });
});
