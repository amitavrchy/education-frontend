import { isRemote, remote } from "./core/remote";

/**
 * Speech made on the server (education-ai, Gemini TTS). Browsers rarely ship a Bangla voice, so in
 * API mode Bangla (and any language without a device voice) is played from this audio instead.
 * Object URLs of recent texts are kept so replaying an answer doesn't fetch it again.
 */
const cache = new Map<string, string>();
const CACHE_SIZE = 40;

function b64ToBlob(data: string, type: string) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Short silent WAV used to unlock audio playback on the first user gesture (Safari/iOS). */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
let player: HTMLAudioElement | null = null;

/** One shared audio element, unlocked on the first tap/click so later replies can play. */
function sharedPlayer(): HTMLAudioElement {
  if (player) return player;
  player = new Audio();
  const unlock = () => {
    if (!player) return;
    player.src = SILENT_WAV;
    void player.play().catch(() => undefined);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  return player;
}

if (typeof window !== "undefined" && isRemote()) sharedPlayer();

export const speechService = {
  /** The shared player (stop it before starting another voice). */
  player: () => sharedPlayer(),


  /** Server speech is available (API mode). */
  available: () => isRemote(),

  /** An object URL of the spoken text (WAV). */
  async audioUrl(text: string, language: "bn" | "en", voice: "female" | "male" = "female"): Promise<string> {
    const key = `${voice}|${language}|${text}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const res = await remote.post<{ mediaType: string; data: string }>("/speech", { text: text.slice(0, 2500), language, voice });
    const url = URL.createObjectURL(b64ToBlob(res.data, res.mediaType || "audio/wav"));
    cache.set(key, url);
    if (cache.size > CACHE_SIZE) {
      const [oldKey, oldUrl] = cache.entries().next().value!;
      cache.delete(oldKey);
      URL.revokeObjectURL(oldUrl);
    }
    return url;
  },
};
