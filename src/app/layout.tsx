import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: siteConfig.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14161c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html lang="bn" className={cn(fontVariables, "h-full")} suppressHydrationWarning>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
