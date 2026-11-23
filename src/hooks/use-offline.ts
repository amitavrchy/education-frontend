"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { OfflineItem } from "@/contracts";
import { useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { offlineService } from "@/services/offline.service";
import { useStudentId } from "./use-student";

export const offlineKeys = { all: (id: string) => ["offline", id] as const, list: (id: string) => ["offline", id, "list"] as const, usage: (id: string) => ["offline", id, "usage"] as const };

export function useOfflineItems() {
  const id = useStudentId();
  return useQuery({ queryKey: offlineKeys.list(id), queryFn: () => offlineService.list(id) });
}

export function useOfflineUsage() {
  const id = useStudentId();
  return useQuery({ queryKey: offlineKeys.usage(id), queryFn: () => offlineService.usage(id) });
}

export function useOfflineActions() {
  const id = useStudentId();
  const qc = useQueryClient();
  const l = useL();
  const done = () => qc.invalidateQueries({ queryKey: offlineKeys.all(id) });
  const onError = (e: unknown) => {
    toast.error(errorText(e, l));
    void done();
  };
  return {
    download: useMutation({ mutationFn: (v: Pick<OfflineItem, "kind" | "refId" | "title" | "sizeMb"> & { version?: string }) => offlineService.download(id, v), onSuccess: (i) => (toast.success(l(`"${i.title}" অফলাইনে সংরক্ষিত`, `"${i.title}" saved for offline`)), done()), onError }),
    remove: useMutation({ mutationFn: (itemId: string) => offlineService.remove(id, itemId), onSuccess: () => (toast.success(l("ডাউনলোড মুছে ফেলা হয়েছে", "Download removed")), done()), onError }),
    removeByRef: useMutation({ mutationFn: (v: { kind: OfflineItem["kind"]; refId: string }) => offlineService.removeByRef(id, v.kind, v.refId), onSuccess: () => (toast.success(l("অফলাইন কপি মুছে ফেলা হয়েছে", "Offline copy removed")), done()), onError }),
    update: useMutation({ mutationFn: (itemId: string) => offlineService.update(id, itemId), onSuccess: () => (toast.success(l("সর্বশেষ সংস্করণে হালনাগাদ হয়েছে", "Updated to the latest version")), done()), onError }),
    sync: useMutation({ mutationFn: () => offlineService.syncAll(id), onSuccess: (r) => (toast.success(l(`${r.synced}টি পরিবর্তন সিঙ্ক হয়েছে`, `${r.synced} changes synced`) + (r.conflicts ? l(` · ${r.conflicts}টি দ্বন্দ্ব বাকি`, ` · ${r.conflicts} conflicts remain`) : "")), done()), onError }),
    resolve: useMutation({ mutationFn: (v: { id: string; keep: "local" | "remote" | "both" }) => offlineService.resolveConflict(id, v.id, v.keep), onSuccess: () => (toast.success(l("দ্বন্দ্ব সমাধান হয়েছে", "Conflict resolved")), done()), onError }),
    clearAll: useMutation({ mutationFn: () => offlineService.clearAll(id), onSuccess: () => (toast.success(l("সব অফলাইন ডেটা মুছে ফেলা হয়েছে", "All offline data cleared")), done()), onError }),
  };
}

/** Status of one downloadable resource + a toggle. */
export function useOfflineToggle(kind: OfflineItem["kind"], refId: string, title: string, sizeMb: number, version = "1") {
  const items = useOfflineItems();
  const actions = useOfflineActions();
  const item = items.data?.find((i) => i.kind === kind && i.refId === refId);
  const busy = actions.download.isPending || actions.removeByRef.isPending || actions.update.isPending;
  return {
    item,
    busy,
    saved: item?.status === "downloaded" || item?.status === "outdated",
    toggle: () => {
      if (item && (item.status === "downloaded" || item.status === "outdated")) actions.removeByRef.mutate({ kind, refId });
      else actions.download.mutate({ kind, refId, title, sizeMb, version });
    },
  };
}
