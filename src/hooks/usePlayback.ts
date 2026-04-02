import { useCallback, useRef, useEffect } from "react";
import * as Tone from "tone";
import type { Song } from "../models/song";

export function usePlayback(song: Song | null) {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const speedRef = useRef(1);
  const songRef = useRef<Song | null>(null);

  // Keep song ref in sync
  useEffect(() => {
    songRef.current = song;
  }, [song]);

  // Initialize synth
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.1 },
    }).toDestination();

    return () => {
      synthRef.current?.dispose();
      Tone.getTransport().cancel();
      Tone.getTransport().stop();
    };
  }, []);

  const scheduleNotes = useCallback((theSong: Song, speed: number) => {
    const transport = Tone.getTransport();
    const synth = synthRef.current;
    if (!synth) return;

    transport.cancel();

    for (const track of theSong.tracks) {
      for (const note of track.notes) {
        const scheduledTime = note.startSec / speed;
        const duration = note.durationSec / speed;

        transport.schedule((time) => {
          synth.triggerAttackRelease(
            Tone.Frequency(note.midi, "midi").toFrequency(),
            duration,
            time,
            note.velocity / 127
          );
        }, scheduledTime);
      }
    }
  }, []);

  // Schedule notes when song changes
  useEffect(() => {
    if (!song || !synthRef.current) return;

    const transport = Tone.getTransport();
    transport.cancel();
    transport.stop();
    transport.seconds = 0;
    speedRef.current = 1;

    scheduleNotes(song, 1);
  }, [song, scheduleNotes]);

  const releaseAll = useCallback(() => {
    synthRef.current?.releaseAll();
  }, []);

  const play = useCallback(async () => {
    await Tone.start();
    Tone.getTransport().start();
  }, []);

  const pause = useCallback(() => {
    Tone.getTransport().pause();
    releaseAll();
  }, [releaseAll]);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.seconds = 0;
    releaseAll();
  }, [releaseAll]);

  const seek = useCallback((timeSec: number) => {
    releaseAll();
    Tone.getTransport().seconds = timeSec / speedRef.current;
  }, [releaseAll]);

  const changeSpeed = useCallback((newSpeed: number) => {
    const song = songRef.current;
    if (!song) return;

    const transport = Tone.getTransport();
    const wasPlaying = transport.state === "started";

    // Get current position in real song time
    const currentSongTime = transport.seconds * speedRef.current;

    // Release held notes
    releaseAll();

    // Pause transport, reschedule, restore position
    transport.pause();
    scheduleNotes(song, newSpeed);

    // Set transport to new position (adjusted for new speed)
    transport.seconds = currentSongTime / newSpeed;
    speedRef.current = newSpeed;

    if (wasPlaying) {
      transport.start();
    }
  }, [scheduleNotes, releaseAll]);

  const getCurrentTime = useCallback((): number => {
    // Convert transport time back to real song time
    return Tone.getTransport().seconds * speedRef.current;
  }, []);

  const getState = useCallback((): string => {
    return Tone.getTransport().state;
  }, []);

  const getSpeed = useCallback((): number => {
    return speedRef.current;
  }, []);

  return { play, pause, stop, seek, changeSpeed, getCurrentTime, getState, getSpeed };
}
