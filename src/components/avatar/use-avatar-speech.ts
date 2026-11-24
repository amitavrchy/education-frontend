"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks text with the device's speech synthesis (if available) and produces a `mouth` level (0–1)
 * for lip-sync. Word-boundary events add emphasis; a jittered envelope keeps the mouth moving between
 * words. Without TTS (or when muted) it simulates speaking time so the avatar still animates.
 */
export function useAvatarSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [mouth, setMouth] = useState(0);
  const [caption, setCaption] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const raf = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const boost = useRef(0);
  const onDone = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const loop = useCallback(() => {
    let t = 0;
    window.clearInterval(raf.current);
    raf.current = window.setInterval(() => {
      t += 1;
      boost.current = Math.max(0, boost.current - 0.06);
      const base = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.42)) + 0.2 * Math.abs(Math.sin(t * 1.3));
      setMouth(Math.min(1, base * (0.6 + Math.random() * 0.5) + boost.current));
    }, 70);
  }, []);

  const finish = useCallback(() => {
    window.clearInterval(raf.current);
    window.clearTimeout(timer.current);
    setSpeaking(false);
    setMouth(0);
    setCaption("");
    const cb = onDone.current;
    onDone.current = undefined;
    cb?.();
  }, []);

  const speak = useCallback(
    (text: string, opts: { lang: "bn" | "en"; rate: number; pitch: number; voiceURI?: string; muted?: boolean }, done?: () => void) => {
      if (supported) window.speechSynthesis.cancel();
      finish();
      if (!text.trim()) return done?.();
      onDone.current = done;
      setSpeaking(true);
      setCaption(text);
      loop();
      const simulate = () => {
        timer.current = window.setTimeout(finish, Math.min(14000, Math.max(1500, (text.length / 13 / opts.rate) * 1000)));
      };
      const lang = opts.lang === "bn" ? "bn-BD" : "en-US";
      const voice = voices.find((v) => v.voiceURI === opts.voiceURI) ?? voices.find((v) => v.lang.toLowerCase().startsWith(opts.lang));
      // No voice for the language (common for Bangla) → animate without audio rather than mispronounce.
      if (!supported || opts.muted || (!voice && opts.lang === "bn")) return simulate();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = opts.rate;
      u.pitch = opts.pitch;
      if (voice) u.voice = voice;
      u.onboundary = () => (boost.current = 0.35);
      u.onend = finish;
      u.onerror = () => simulate();
      window.speechSynthesis.speak(u);
    },
    [supported, voices, loop, finish],
  );

  const stop = useCallback(() => {
    onDone.current = undefined;
    if (supported) window.speechSynthesis.cancel();
    finish();
  }, [supported, finish]);

  useEffect(() => () => stop(), [stop]);

  const hasVoiceFor = useCallback((lang: "bn" | "en") => voices.some((v) => v.lang.toLowerCase().startsWith(lang)), [voices]);

  return { supported, speaking, mouth, caption, voices, speak, stop, hasVoiceFor };
}
