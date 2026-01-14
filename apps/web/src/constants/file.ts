import type { TFileStatus } from "@my-scope/shared/types";

export const FILE_STATUS_STYLES: Record<TFileStatus, string> = {
  uploaded: "bg-amber-100 text-amber-700",
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};
