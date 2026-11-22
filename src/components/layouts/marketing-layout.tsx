import { MarketingFooter } from "@/components/navigation/marketing-footer";
import { MarketingNavbar } from "@/components/navigation/marketing-navbar";
import type { WithChildren } from "@/types";

export function MarketingLayout({ children }: WithChildren) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
