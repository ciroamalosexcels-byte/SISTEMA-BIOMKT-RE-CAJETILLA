"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const RAINBOW_COLORS = ["#ef4444", "#22c55e", "#f6bf26", "#3b82f6"];

function fireConfetti() {
  const end = Date.now() + 3000;
  (function frame() {
    confetti({
      particleCount: 4,
      startVelocity: 15,
      spread: 70,
      ticks: 220,
      gravity: 0.85,
      origin: { x: Math.random(), y: -0.1 },
      colors: RAINBOW_COLORS,
      scalar: 1.1,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

interface PlayOptions {
  /** Segundo del archivo en el que arranca la reproducción. */
  seekTo?: number;
  /** Segundo del archivo en el que empieza el fade a volumen 0. */
  fadeStart?: number;
  /** Segundo del archivo en el que se corta la reproducción. */
  stopAt?: number;
  /** Volumen máximo (0 a 1) antes de que arranque el fade. */
  peakVolume?: number;
}

function playTrack(src: string, { seekTo = 0, fadeStart, stopAt, peakVolume = 1 }: PlayOptions = {}): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = peakVolume;

  audio.addEventListener("error", () => {
    // eslint-disable-next-line no-console
    console.error("[birthday] no se pudo cargar", src, audio.error);
  });

  function onTimeUpdate() {
    if (stopAt !== undefined && audio.currentTime >= stopAt) {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      return;
    }
    if (fadeStart !== undefined && stopAt !== undefined && audio.currentTime >= fadeStart) {
      const fraction = (audio.currentTime - fadeStart) / (stopAt - fadeStart);
      audio.volume = Math.max(0, peakVolume * (1 - fraction));
    }
  }

  function reportPlayError(err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[birthday] play() rechazado", src, err);
  }

  const needsTimeTracking = fadeStart !== undefined || stopAt !== undefined;

  if (seekTo > 0) {
    // currentTime solo se puede fijar de forma confiable una vez que se
    // conocen los metadatos (duración/seekable) del archivo.
    audio.addEventListener("loadedmetadata", () => {
      audio.currentTime = seekTo;
      if (needsTimeTracking) audio.addEventListener("timeupdate", onTimeUpdate);
      audio.play().catch(reportPlayError);
    }, { once: true });
    audio.load();
  } else {
    if (needsTimeTracking) audio.addEventListener("timeupdate", onTimeUpdate);
    audio.play().catch(reportPlayError);
  }

  return audio;
}

/**
 * Confeti + sonidos que se disparan una vez al entrar a la ventana de
 * Equipo, si hoy es el cumpleaños de algún integrante. Sin efecto visible
 * (no renderiza nada) — solo dispara los side effects al montar.
 */
export function BirthdayCelebration() {
  useEffect(() => {
    fireConfetti();

    const happyBirthday = playTrack("/sounds/happy-birthday.mp3", { seekTo: 3, fadeStart: 13, stopAt: 15, peakVolume: 0.8 });
    const timers = [
      setTimeout(() => playTrack("/sounds/yeeey.mp3"), 500),
      setTimeout(() => playTrack("/sounds/silbato-fiesta.mp3"), 750),
    ];

    return () => {
      timers.forEach(clearTimeout);
      happyBirthday.pause();
    };
  }, []);

  return null;
}
