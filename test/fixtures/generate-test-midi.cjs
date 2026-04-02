// Generates a simple test MIDI file: C major scale (right hand) + C chord (left hand)
// Run with: node test/fixtures/generate-test-midi.cjs

const { Midi } = require("@tonejs/midi");
const { writeFileSync } = require("fs");
const { join } = require("path");

const midi = new Midi();
midi.name = "Test - C Major Scale";

// Track 0: Right hand - C major scale ascending
const rightHand = midi.addTrack();
rightHand.name = "Right Hand";
rightHand.channel = 0;
rightHand.instrument.number = 0; // Acoustic Grand Piano

const scaleNotes = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5
scaleNotes.forEach((midi_note, i) => {
  rightHand.addNote({
    midi: midi_note,
    time: i * 0.5,
    duration: 0.45,
    velocity: 0.7,
  });
});

// Track 1: Left hand - whole note chords
const leftHand = midi.addTrack();
leftHand.name = "Left Hand";
leftHand.channel = 1;
leftHand.instrument.number = 0;

// C major chord for first 2 seconds
[48, 52, 55].forEach((midi_note) => {
  leftHand.addNote({ midi: midi_note, time: 0, duration: 2, velocity: 0.5 });
});
// F major chord for next 2 seconds
[53, 57, 60].forEach((midi_note) => {
  leftHand.addNote({ midi: midi_note, time: 2, duration: 2, velocity: 0.5 });
});

midi.header.setTempo(120);

const outPath = join(__dirname, "test-c-major-scale.mid");
writeFileSync(outPath, Buffer.from(midi.toArray()));
console.log(`Written to ${outPath}`);
console.log(`Duration: ${midi.duration.toFixed(2)}s`);
console.log(`Tracks: ${midi.tracks.length}`);
console.log(`Right hand notes: ${rightHand.notes.length}`);
console.log(`Left hand notes: ${leftHand.notes.length}`);
