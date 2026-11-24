# Flutter Architecture (pointer)

The Flutter student app lives in a **separate repository**, `education-flutter`
(github.com/amitavrchy/education-flutter), and has its own `PROGRESS.md`, feature matrix and architecture notes.

Alignment with this web repo:

| Concern | Web (this repo) | Flutter |
| --- | --- | --- |
| Domain models | `src/contracts/*.ts` | Equivalent Dart models (Freezed/json_serializable) kept shape-compatible |
| Data access | Repository interface + mock (IndexedDB) / REST switch | Repository abstraction + local persistence, Dio-ready |
| State | TanStack Query + Zustand | Riverpod |
| Routing | App Router, config-driven navigation | GoRouter |
| Design tokens | `src/app/globals.css` (OKLCH tokens), Inter + Hind Siliguri | Material 3 theme mirroring the same palette and type scale |
| i18n | `src/i18n/messages/{bn,en}.ts` | Flutter localization (ARB) |

TypeScript packages are not imported into Dart. Shared contracts are kept platform-neutral; a JSON-schema
export is a planned follow-up (see `docs/testing/KNOWN_LIMITATIONS.md`).
