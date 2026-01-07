import { Types } from "mongoose";

// File types
export const fileStatusValues = ["uploaded", "processing", "ready", "failed"] as const;
export type FileStatus = (typeof fileStatusValues)[number];

export type File = {
  _id: Types.ObjectId;
  owner_id: string;
  file_name: string;
  storage_path: string;
  page_count: number;
  status: FileStatus;
  created_at: Date;
  updated_at: Date;
};
