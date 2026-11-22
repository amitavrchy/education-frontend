import { SearchBar } from "@/components/common/search-bar";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationPanel } from "./notification-panel";
import { UserDropdown } from "./user-dropdown";

/** Top bar for every authenticated portal. */
export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-header items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <MobileSidebar />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <SearchBar className="hidden w-64 md:flex" placeholder="খুঁজুন..." />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationPanel />
        <UserDropdown />
      </div>
    </header>
  );
}
