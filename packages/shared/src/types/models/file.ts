import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

// File types
export const fileStatusValues = ["uploaded", "processing", "ready", "failed"] as const;
export type FileStatus = (typeof fileStatusValues)[number];

export type TFile<TFileUser = string> = {
  user: TFileUser;
  file_name: string;
  status: FileStatus;
};

export type TFileDoc<TId = TObjectId, TFileUser = string> = TDocument<TId> & TFile<TFileUser>;

export type TFileModel<TFileUser = string> = Model<TFile<TFileUser>>;
