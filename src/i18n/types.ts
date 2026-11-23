import type { bn } from "./messages/bn";

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

/** Shape every locale must implement (derived from the Bangla source dictionary). */
export type Messages = DeepString<typeof bn>;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Dot-path of every translatable string, e.g. "nav.dashboard". */
export type MessageKey = Leaves<Messages>;

export type MessageVars = Record<string, string | number>;
