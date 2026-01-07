import { Schema, model, models } from "mongoose";
import type { File, FileStatus } from "@my-scope/shared/types";
import { fileStatusValues } from "@my-scope/shared/types";

const fileSchema = new Schema<File>(
  {
    owner_id: { type: String, required: true },
    file_name: { type: String, required: true },
    storage_path: { type: String, required: true },
    page_count: { type: Number, required: true },
    status: { type: String, enum: fileStatusValues, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

fileSchema.index({ owner_id: 1, created_at: -1 });

export const FileModel = models.File || model<File>("File", fileSchema);
