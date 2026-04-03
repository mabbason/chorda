import { useCallback, useRef, useEffect, useState } from "react";
import * as Tone from "tone";
import type { Song } from "../models/song";

const SALAMANDER_BASE_URL = "https://tonejs.github.io/audio/salamander/";

const SAMPLER_NOTES: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};

export function usePlayback(song: Song | null, visibleHands: Set<string>) {
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const speedRef = useRef(1);
  const songRef = useRef<Song | null>(null);
  const visibleHandsRef = useRef(visibleHands);
  const [samplerLoaded, setSamplerLoaded] = useState(false);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  useEffect(() => {
    visibleHandsRef.current = visibleHands;
  }, [visibleHands]);

  // Initialize sampler with Salamander Grand Piano samples
  useEffect(() => {
    const sampler = new Tone.Sampler({
      urls: SAMPLER_NOTES,
      baseUrl: SALAMANDER_BASE_URL,
      release: 1,
      onload: () => setSamplerLoaded(true),
    }).toDestination();

    samplerRef.current = sampler;

    return () => {
      sampler.dispose();
      Tone.getTransport().cancel();
      Tone.getTransport().stop();
    };
  }, []);

  const scheduleNotes = useCallback((theSong: Song, speed: number, hands: Set<string>) => {
    const transport = Tone.getTransport();
    const sampler = samplerRef.current;
    if (!sampler) return;

    transport.cancel();

    for (const track of theSong.tracks) {
      if (!hands.has(track.hand) && track.hand !== "unknown") continue;
      for (const note of track.notes) {
        const scheduledTime = note.startSec / speed;
        const duration = note.durationSec / speed;

        transport.schedule((time) => {
          const freq = Tone.Frequency(note.midi, "midi").toFrequency();
          sampler.triggerAttackRelease(freq, duration, time, note.velocity / 127);
        }, scheduledTime);
      }
    }
  }, []);

  const handEffectMounted = useRef(false);

  useEffect(() => {
    if (!song || !samplerRef.current) return;

    const transport = Tone.getTransport();
    transport.cancel();
    transport.stop();
    transport.seconds = 0;
    speedRef.current = 1;
    handEffectMounted.current = false;

    scheduleNotes(song, 1, visibleHandsRef.current);
  }, [song, scheduleNotes]);

  // Reschedule notes when hand visibility changes (preserve playback position)
  useEffect(() => {
    if (!handEffectMounted.current) {
      handEffectMounted.current = true;
      return;
    }

    const currentSong = songRef.current;
    if (!currentSong || !samplerRef.current) return;

    const transport = Tone.getTransport();
    const wasPlaying = transport.state === "started";
    const currentPos = transport.seconds;

    samplerRef.current.releaseAll();
    scheduleNotes(currentSong, speedRef.current, visibleHands);
    transport.seconds = currentPos;

    if (wasPlaying) {
      transport.start();
    }
  }, [visibleHands, scheduleNotes]);

  const releaseAll = useCallback(() => {
    samplerRef.current?.releaseAll();
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
    const currentSongTime = transport.seconds * speedRef.current;

    releaseAll();
    transport.pause();
    scheduleNotes(song, newSpeed, visibleHandsRef.current);
    transport.seconds = currentSongTime / newSpeed;
    speedRef.current = newSpeed;

    if (wasPlaying) {
      transport.start();
    }
  }, [scheduleNotes, releaseAll]);

  const getCurrentTime = useCallback((): number => {
    return Tone.getTransport().seconds * speedRef.current;
  }, []);

  const getState = useCallback((): string => {
    return Tone.getTransport().state;
  }, []);

  const getSpeed = useCallback((): number => {
    return speedRef.current;
  }, []);

  return { play, pause, stop, seek, changeSpeed, getCurrentTime, getState, getSpeed, samplerLoaded };
}
