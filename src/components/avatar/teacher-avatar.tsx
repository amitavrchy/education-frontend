"use client";

import { memo, useId } from "react";
import type { AvatarAppearance } from "@/contracts";
import { cn } from "@/lib/utils";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

/** Darken/lighten a #rrggbb colour by `amt` (-1..1). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f(n >> 16),
    g = f((n >> 8) & 255),
    b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Live 2D teacher avatar (pure SVG + CSS animation): idle breathing, blinking, lip-sync driven by
 * `mouth` (0–1), listening pulse, thinking bubble and a slight head motion while speaking.
 * Honors prefers-reduced-motion. Decorative for screen readers — state is announced by the caller.
 */
export const TeacherAvatar = memo(function TeacherAvatar({ appearance: a, state = "idle", mouth = 0, size = 240, className, label }: { appearance: AvatarAppearance; state?: AvatarState; mouth?: number; size?: number; className?: string; label?: string }) {
  const uid = useId().replace(/:/g, "");
  const skinShadow = shade(a.skinTone, -0.18);
  const hairDark = shade(a.hairColor, -0.25);
  const outfitDark = shade(a.outfitColor, -0.25);
  const m = state === "speaking" ? Math.max(0, Math.min(1, mouth)) : 0;
  const lookUp = state === "thinking";
  const brow = state === "listening" ? -3 : state === "thinking" ? -2 : 0;
  const female = a.gender === "female";
  const hijab = a.hairStyle === "hijab";

  return (
    <svg viewBox="0 0 240 280" width={size} height={(size * 280) / 240} className={cn("select-none", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <style>{`
        .b-${uid}{animation:breathe-${uid} 4.2s ease-in-out infinite;transform-origin:120px 280px}
        .e-${uid}{animation:blink-${uid} 5.2s infinite;transform-box:fill-box;transform-origin:center}
        .h-${uid}{transform-origin:120px 190px;transition:transform .3s}
        .s-${uid}{animation:talk-${uid} 1.6s ease-in-out infinite}
        .p-${uid}{animation:pulse-${uid} 1.4s ease-out infinite;transform-origin:120px 140px}
        .d-${uid}{animation:dot-${uid} 1.2s infinite}
        @keyframes breathe-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
        @keyframes blink-${uid}{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
        @keyframes talk-${uid}{0%,100%{transform:rotate(0)}30%{transform:rotate(-1.4deg)}70%{transform:rotate(1.2deg)}}
        @keyframes pulse-${uid}{0%{opacity:.55;transform:scale(.92)}100%{opacity:0;transform:scale(1.12)}}
        @keyframes dot-${uid}{0%,100%{opacity:.25}50%{opacity:1}}
        @media (prefers-reduced-motion: reduce){.b-${uid},.e-${uid},.s-${uid},.p-${uid},.d-${uid}{animation:none}}
      `}</style>

      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x="0" y="0" width="240" height="280" rx="28" />
        </clipPath>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={shade(a.background, 0.35)} />
          <stop offset="100%" stopColor={a.background} />
        </radialGradient>
      </defs>

      <g clipPath={`url(#clip-${uid})`}>
        <rect width="240" height="280" fill={`url(#bg-${uid})`} />
        {state === "listening" && <circle className={`p-${uid}`} cx="120" cy="140" r="104" fill="none" stroke={a.accentColor} strokeWidth="6" />}

        <g className={`b-${uid}`}>
          {/* Long hair / hijab behind the body */}
          {a.hairStyle === "long" && <path d="M66 118 C 60 175, 64 225, 78 250 L 162 250 C 176 225, 180 175, 174 118 Z" fill={hairDark} />}
          {hijab && <path d="M58 120 C 54 190, 40 230, 30 280 L 210 280 C 200 230, 186 190, 182 120 C 178 60, 62 60, 58 120 Z" fill={a.accentColor} />}

          {/* Torso */}
          <path d="M28 280 C 32 228, 72 206, 120 206 C 168 206, 208 228, 212 280 Z" fill={a.outfitColor} />
          {a.outfit === "blazer" && (
            <>
              <path d="M98 208 L 120 262 L 142 208 C 132 206, 108 206, 98 208 Z" fill="#F8FAFC" />
              <path d="M96 208 L 120 262 L 104 280 L 70 280 C 72 240, 84 216, 96 208 Z" fill={outfitDark} />
              <path d="M144 208 L 120 262 L 136 280 L 170 280 C 168 240, 156 216, 144 208 Z" fill={outfitDark} />
            </>
          )}
          {a.outfit === "shirt" && (
            <>
              <path d="M104 207 L 120 236 L 136 207 Z" fill={a.skinTone} />
              <path d="M100 206 L 120 238 L 110 246 L 92 214 Z M140 206 L 120 238 L 130 246 L 148 214 Z" fill="#F8FAFC" />
              <circle cx="120" cy="252" r="2" fill={outfitDark} />
              <circle cx="120" cy="268" r="2" fill={outfitDark} />
            </>
          )}
          {a.outfit === "panjabi" && (
            <>
              <path d="M112 207 C 114 214, 126 214, 128 207 Z" fill={a.skinTone} />
              <rect x="117" y="212" width="6" height="56" rx="2" fill={outfitDark} opacity=".35" />
              {[222, 236, 250].map((y) => (
                <circle key={y} cx="120" cy={y} r="1.8" fill={a.accentColor} />
              ))}
            </>
          )}
          {a.outfit === "saree" && (
            <>
              <path d="M104 207 C 110 218, 130 218, 136 207 Z" fill={a.skinTone} />
              <path d="M150 208 C 132 236, 104 256, 82 280 L 120 280 C 138 256, 160 236, 178 220 C 170 213, 160 209, 150 208 Z" fill={a.accentColor} />
              <path d="M150 208 C 132 236, 104 256, 82 280" fill="none" stroke={shade(a.accentColor, 0.4)} strokeWidth="3" />
            </>
          )}
          {a.outfit === "salwar" && (
            <>
              <path d="M104 207 C 110 220, 130 220, 136 207 Z" fill={a.skinTone} />
              <path d="M62 236 C 90 252, 150 252, 178 236 L 184 252 C 150 270, 90 270, 56 252 Z" fill={a.accentColor} opacity=".9" />
            </>
          )}

          {/* Head group (moves while speaking) */}
          <g className={cn(`h-${uid}`, state === "speaking" && `s-${uid}`)} style={{ transform: lookUp ? "rotate(-3deg)" : undefined }}>
            {/* Neck */}
            <path d="M104 160 L 104 204 C 112 212, 128 212, 136 204 L 136 160 Z" fill={a.skinTone} />
            <path d="M104 178 C 112 188, 128 188, 136 178 L 136 166 L 104 166 Z" fill={skinShadow} opacity=".5" />

            {/* Ears */}
            {!hijab && (
              <>
                <ellipse cx="72" cy="124" rx="8" ry="12" fill={a.skinTone} />
                <ellipse cx="168" cy="124" rx="8" ry="12" fill={a.skinTone} />
                {female && (
                  <>
                    <circle cx="72" cy="138" r="2.6" fill={a.accentColor} />
                    <circle cx="168" cy="138" r="2.6" fill={a.accentColor} />
                  </>
                )}
              </>
            )}

            {/* Face */}
            <ellipse cx="120" cy="118" rx="48" ry="56" fill={a.skinTone} />

            {/* Hair */}
            {a.hairStyle === "short" && <path d="M71 112 C 66 66, 100 52, 122 54 C 150 54, 176 70, 170 112 C 164 92, 150 80, 122 80 C 98 80, 80 90, 71 112 Z" fill={a.hairColor} />}
            {a.hairStyle === "side_part" && <path d="M70 116 C 64 70, 96 50, 124 52 C 156 54, 178 74, 170 114 C 164 94, 154 84, 136 80 C 124 92, 98 92, 80 96 C 76 102, 72 108, 70 116 Z" fill={a.hairColor} />}
            {(a.hairStyle === "long" || a.hairStyle === "bun") && <path d="M70 124 C 62 70, 96 52, 122 52 C 150 52, 180 70, 170 124 C 166 96, 152 82, 140 78 C 130 90, 104 88, 92 80 C 80 88, 72 104, 70 124 Z" fill={a.hairColor} />}
            {a.hairStyle === "bun" && <circle cx="120" cy="50" r="18" fill={a.hairColor} />}
            {a.hairStyle === "bald" && <path d="M72 120 C 70 106, 74 98, 78 94 L 80 120 Z M168 120 C 170 106, 166 98, 162 94 L 160 120 Z" fill={a.hairColor} />}
            {hijab && <path d="M66 126 C 60 64, 180 64, 174 126 C 172 96, 158 74, 120 72 C 82 74, 68 96, 66 126 Z" fill={shade(a.accentColor, -0.12)} />}

            {/* Brows */}
            <g transform={`translate(0 ${brow})`}>
              <path d="M90 98 Q 101 92, 111 97" fill="none" stroke={hairDark} strokeWidth="3.4" strokeLinecap="round" />
              <path d="M129 97 Q 139 92, 150 98" fill="none" stroke={hairDark} strokeWidth="3.4" strokeLinecap="round" />
            </g>

            {/* Eyes */}
            <g className={`e-${uid}`}>
              <ellipse cx="101" cy="114" rx="8.5" ry="6.5" fill="#fff" />
              <ellipse cx="139" cy="114" rx="8.5" ry="6.5" fill="#fff" />
              <circle cx={lookUp ? 104 : 101} cy={lookUp ? 111 : 114.5} r="4.2" fill="#2B1D16" />
              <circle cx={lookUp ? 142 : 139} cy={lookUp ? 111 : 114.5} r="4.2" fill="#2B1D16" />
              <circle cx={lookUp ? 105.5 : 102.5} cy={lookUp ? 109.5 : 113} r="1.3" fill="#fff" />
              <circle cx={lookUp ? 143.5 : 140.5} cy={lookUp ? 109.5 : 113} r="1.3" fill="#fff" />
            </g>

            {a.glasses && (
              <g fill="none" stroke="#1F2937" strokeWidth="2.4">
                <rect x="88" y="104" width="26" height="20" rx="7" />
                <rect x="126" y="104" width="26" height="20" rx="7" />
                <path d="M114 112 Q 120 108, 126 112" />
              </g>
            )}

            {/* Nose & cheeks */}
            <path d="M120 120 C 118 130, 114 136, 118 139 C 121 140, 124 139, 125 137" fill="none" stroke={skinShadow} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="92" cy="136" r="7" fill="#F08A8A" opacity=".18" />
            <circle cx="148" cy="136" r="7" fill="#F08A8A" opacity=".18" />

            {/* Beard */}
            {a.beard && <path d="M76 132 C 80 168, 100 178, 120 178 C 140 178, 160 168, 164 132 C 160 150, 146 160, 140 154 C 132 160, 108 160, 100 154 C 94 160, 80 150, 76 132 Z" fill={a.hairColor} opacity=".85" />}

            {/* Mouth (lip-sync) */}
            {m < 0.06 ? (
              <path d="M106 150 Q 120 160, 134 150" fill="none" stroke="#8C3B3B" strokeWidth="3.2" strokeLinecap="round" />
            ) : (
              <g>
                <ellipse cx="120" cy={152 + m * 2} rx={11 + m * 2} ry={2.5 + m * 9} fill="#5B1F23" />
                <rect x={112} y={150 - (2.5 + m * 9) + 1.5} width="16" height={Math.min(4, 1 + m * 4)} rx="1.5" fill="#fff" opacity=".9" />
                <ellipse cx="120" cy={154 + m * 6} rx={6 + m * 2} ry={1.5 + m * 2.5} fill="#E36F7A" opacity=".85" />
              </g>
            )}
          </g>
        </g>

        {state === "thinking" && (
          <g>
            <circle cx="186" cy="58" r="20" fill="#fff" opacity=".95" />
            <circle cx="166" cy="84" r="5" fill="#fff" opacity=".9" />
            {[176, 186, 196].map((x, i) => (
              <circle key={x} className={`d-${uid}`} style={{ animationDelay: `${i * 0.18}s` }} cx={x} cy="58" r="3.2" fill="#475569" />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
});
