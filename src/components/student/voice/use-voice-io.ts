"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Browser speech APIs are not in the TS DOM lib everywhere; keep a minimal local typing. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type MicError = "denied" | "not_found" | "unsupported" | "other" | null;

/** Microphone stream + live level analysis (for the waveform) + device selection. */
export function useMicrophone() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<MicError>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const analyser = useRef<AnalyserNode | null>(null);
  const ctx = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    void ctx.current?.close().catch(() => undefined);
    ctx.current = null;
    analyser.current = null;
  }, []);

  const request = useCallback(
    async (id?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("unsupported");
        return false;
      }
      try {
        stop();
        const s = await navigator.mediaDevices.getUserMedia({ audio: id ? { deviceId: { exact: id } } : true });
        const ac = new AudioContext();
        const src = ac.createMediaStreamSource(s);
        const an = ac.createAnalyser();
        an.fftSize = 64;
        src.connect(an);
        ctx.current = ac;
        analyser.current = an;
        setStream(s);
        setError(null);
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "audioinput"));
        return true;
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "not_found" : "other");
        return false;
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  const levels = useCallback((): number[] | null => {
    if (!analyser.current) return null;
    const data = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(data);
    return Array.from(data.slice(0, 24), (v) => v / 255);
  }, []);

  return { stream, error, devices, deviceId, setDeviceId, request, stop, levels };
}

/** Device speech-to-text (if the browser has it). Clearly a device feature, not the AI service. */
export function useDeviceRecognition() {
  const [supported] = useState(() => !!recognitionCtor());
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const [interim, setInterim] = useState("");

  const start = useCallback((lang: string, onFinal: (text: string) => void, onEnd?: (error?: string) => void) => {
    const Ctor = recognitionCtor();
    if (!Ctor) return false;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = text;
      }
      setInterim(text);
    };
    r.onerror = (e) => onEnd?.(e.error);
    r.onend = () => {
      setInterim("");
      if (finalText.trim()) onFinal(finalText.trim());
      else onEnd?.();
    };
    rec.current = r;
    try {
      r.start();
      return true;
    } catch {
      return false;
    }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const abort = useCallback(() => {
    rec.current?.abort();
    setInterim("");
  }, []);
  useEffect(() => () => rec.current?.abort(), []);
  return { supported, start, stop, abort, interim };
}

/** Device text-to-speech with voice choice and speed. Falls back to a timed "speaking" state. */
export function useDeviceSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const timer = useRef<number | undefined>(undefined);

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

  const speak = useCallback(
    (text: string, opts: { lang: string; rate: number; voiceURI?: string; muted?: boolean }, onEnd: () => void) => {
      window.clearTimeout(timer.current);
      const fallback = () => {
        // Simulated speaking duration (~14 chars/sec at 1x) when TTS is unavailable or muted.
        timer.current = window.setTimeout(onEnd, Math.min(9000, Math.max(1200, (text.length / 14 / opts.rate) * 1000)));
      };
      if (!supported || opts.muted) return fallback();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang;
      u.rate = opts.rate;
      const v = voices.find((x) => x.voiceURI === opts.voiceURI) ?? voices.find((x) => x.lang.startsWith(opts.lang.slice(0, 2)));
      if (v) u.voice = v;
      u.onend = onEnd;
      u.onerror = () => fallback();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [supported, voices],
  );

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, voices, speak, cancel };
}

export function useNetworkQuality(lastLatency: number | null) {
  const [effective, setEffective] = useState<string | null>(null);
  useEffect(() => {
    const c = (navigator as unknown as { connection?: { effectiveType?: string; addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void } }).connection;
    if (!c) return;
    const update = () => setEffective(c.effectiveType ?? null);
    update();
    c.addEventListener?.("change", update);
    return () => c.removeEventListener?.("change", update);
  }, []);
  if (effective === "slow-2g" || effective === "2g" || (lastLatency ?? 0) > 2500) return "poor" as const;
  if (effective === "3g" || (lastLatency ?? 0) > 1500) return "fair" as const;
  return "good" as const;
}
