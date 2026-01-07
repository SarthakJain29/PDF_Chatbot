import { Schema, model } from "mongoose";
import type { TFile, FileStatus } from "@my-scope/shared/types";
import { fileStatusValues } from "@my-scope/shared/types";

const file_schema = new Schema<TFile>(
  {
    user: { type: String, required: true },
    file_name: { type: String, required: true },
    storage_path: { type: String, required: true },
    page_count: { type: Number, required: true },
    status: { type: String, enum: fileStatusValues, required: true },
  },
  { timestamps: true }
);

// Indexes for Files
file_schema.index({ user: 1, createdAt: -1 }); // Primary filter - user's files sorted by creation

export const file_model = model<TFile>("File", file_schema, "files");
