# Voice Session Contract

Current implementation: `src/services/voice.service.ts` (`VoiceAdapter` mock) +
`src/components/student/voice/use-voice-io.ts` (device SpeechRecognition / speechSynthesis when available,
microphone selection via `enumerateDevices`). AI replies are scripted and labelled; device speech is labelled
as device speech. The UI never claims production speech recognition.

## Adapter seam

```ts
interface VoiceAdapter {
  opening(language, mode, subjectId?): VoiceReply;
  reply(input: { sessionId, text, language, mode, subjectId?, history }): Promise<VoiceReply>;
}
```

A realtime adapter replaces the mock without UI changes.

## Target realtime protocol (WebSocket `wss://…/voice/sessions/:id`)

Client → server:

| Message | Payload |
| --- | --- |
| `session.start` | `{ language: "bn"\|"en"\|"mixed", mode: "tutor"\|"oral_exam", voiceId, subjectId? }` |
| `audio.chunk` | binary PCM16 16 kHz frames (push-to-talk or VAD) |
| `audio.commit` | end of utterance (push-to-talk release) |
| `response.cancel` | interrupt AI speech (barge-in) |
| `text.input` | typed message during a voice session |
| `session.end` | — |

Server → client:

| Message | Payload | UI state |
| --- | --- | --- |
| `state` | `{ value: "listening" \| "processing" \| "speaking" \| "idle" }` | indicators + waveform |
| `transcript.partial` / `transcript.final` | `{ turnId, speaker: "student", text }` | student bubble |
| `response.text.delta` | `{ turnId, text }` | AI bubble (text/voice sync) |
| `response.audio.chunk` | binary audio | playback (speed adjustable client-side) |
| `response.done` | `{ turnId }` | — |
| `quota` | `VoiceQuota { minutesUsed, minutesLimit, periodLabel }` | usage limit banner |
| `network` | `{ rttMs, quality: "good"\|"fair"\|"poor" }` | network indicator |
| `error` | `{ code: MIC_PERMISSION \| QUOTA_EXCEEDED \| NETWORK \| UPSTREAM }` | error states |

## Persistence

`VoiceSession { id, title, mode, language, voiceId, subjectId?, startedAt, endedAt?, durationSec, turns[], saved, summary? }`.
Each `VoiceTurn` has `origin: "device_speech" | "demo_script" | "typed" | "mock_ai"` (backend: `"asr"` / `"ai"`).
Conversions to notes, summary and flashcards use the same endpoints as the text tutor.
