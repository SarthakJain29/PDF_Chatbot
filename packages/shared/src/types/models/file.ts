import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

export const fileStatusValues = ["uploaded", "processing", "ready", "failed"] as const;
export type TFileStatus = (typeof fileStatusValues)[number];

export type TFile<TFileUser = string> = {
  user: TFileUser;
  file_name: string;
  status: TFileStatus;
  file_url?: string;
  storage_id?: string;
  size_bytes?: number;
  mime_type?: string;
  page_count?: number;
};

export type TFileDoc<TId = TObjectId, TFileUser = string> = TDocument<TId> & TFile<TFileUser>;

export type TFileModel<TFileUser = string> = Model<TFile<TFileUser>>;
