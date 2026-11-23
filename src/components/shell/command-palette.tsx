"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, FileQuestionMark, Layers, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { portalItems } from "@/config/navigation";
import { useCan } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { useFormat, useL, useT } from "@/i18n";
import { searchService, type SearchHit } from "@/services/search-registry";
import { usePreferencesStore } from "@/stores/preferences-store";
import { usePortal } from "./portal-context";

const KIND_ICON: Record<string, typeof Search> = { subject: BookOpen, chapter: Layers, topic: Layers, question: FileQuestionMark };

/** ⌘K / Ctrl+K palette: navigation for every portal, plus content search in the student portal. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const router = useRouter();
  const portal = usePortal();
  const can = useCan();
  const t = useT();
  const l = useL();
  const { pick } = useFormat();
  const recent = usePreferencesStore((s) => s.recentSearches);
  const addRecent = usePreferencesStore((s) => s.addRecentSearch);
  const removeRecent = usePreferencesStore((s) => s.removeRecentSearch);
  const isStudent = portal.key === "student";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  const hits = useQuery({
    queryKey: ["quick-search", debounced],
    queryFn: () => searchService.quick(debounced),
    enabled: isStudent && open && debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  const navItems = useMemo(() => portalItems(portal.key).filter((i) => can(i.permission)), [portal.key, can]);

  const go = (href: string, remember?: string) => {
    if (remember) addRecent(remember);
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const searchAll = () => go(`/student/search?q=${encodeURIComponent(query.trim())}`, query.trim());

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-start gap-2 text-muted-foreground md:flex lg:w-72"
        onClick={() => setOpen(true)}
        aria-label={t("shell.searchPlaceholder")}
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left text-sm">{t("shell.searchPlaceholder")}</span>
        <kbd className="rounded border bg-muted px-1.5 text-[10px]">{t("shell.searchShortcut")}</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label={t("common.search")}>
        <Search />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("common.search")} description={t("shell.searchPlaceholder")}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("shell.searchPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isStudent && query.trim() && (e.metaKey || e.ctrlKey)) searchAll();
          }}
        />
        <CommandList>
          <CommandEmpty>{t("states.noResults")}</CommandEmpty>
          {isStudent && query.trim().length >= 2 && (
            <CommandGroup heading={l("কনটেন্ট", "Content")}>
              <CommandItem value={`search-all ${query}`} onSelect={searchAll}>
                <Search /> {l(`সব ফলাফল দেখুন: “${query}”`, `See all results for “${query}”`)}
              </CommandItem>
              {(hits.data ?? []).map((hit: SearchHit) => {
                const Icon = KIND_ICON[hit.kind] ?? Search;
                return (
                  <CommandItem key={`${hit.kind}-${hit.id}`} value={`${hit.kind} ${hit.id} ${query}`} onSelect={() => go(hit.href, query.trim())}>
                    <Icon />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{pick(hit.title)}</span>
                      {hit.subtitle && <span className="truncate text-xs text-muted-foreground">{pick(hit.subtitle)}</span>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          {isStudent && !query && recent.length > 0 && (
            <CommandGroup heading={l("সাম্প্রতিক অনুসন্ধান", "Recent searches")}>
              {recent.map((r) => (
                <CommandItem key={r} value={`recent ${r}`} onSelect={() => go(`/student/search?q=${encodeURIComponent(r)}`, r)}>
                  <Clock />
                  <span className="flex-1">{r}</span>
                  <button
                    type="button"
                    aria-label={l("মুছুন", "Remove")}
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(r);
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading={l("পেজে যান", "Go to")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.slug} value={`${t(item.titleKey)} ${item.slug}`} onSelect={() => go(`${portal.basePath}/${item.slug}`)}>
                  <Icon /> {t(item.titleKey)}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
