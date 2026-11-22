import { Hind_Siliguri, Inter } from "next/font/google";

/** Latin UI font. */
export const fontLatin = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Bangla font. Covers Bengali glyphs; Latin falls back to Inter first. */
export const fontBangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const fontVariables = `${fontLatin.variable} ${fontBangla.variable}`;
