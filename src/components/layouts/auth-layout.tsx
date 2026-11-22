import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { siteConfig } from "@/config/site";
import type { WithChildren } from "@/types";

/** Split-screen auth shell: brand panel on large screens, centered form everywhere. */
export function AuthLayout({ children }: WithChildren) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Logo inverted />
        <div className="max-w-md space-y-3">
          <h2 className="text-h1">{siteConfig.nameBn}</h2>
          <p className="text-lg opacity-90">{siteConfig.tagline}</p>
        </div>
        <p className="text-sm opacity-75">AI টিউটর · প্রশ্ন ব্যাংক · পরীক্ষা · অ্যানালিটিক্স</p>
      </aside>
      <div className="flex flex-col">
        <div className="flex h-header items-center justify-between px-4 sm:px-6 lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
