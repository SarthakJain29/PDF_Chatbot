import { Schema, model, models, Types } from "mongoose";

export const fileStatusValues = ["uploaded", "processing", "ready", "failed"] as const;
export type FileStatus = (typeof fileStatusValues)[number];

export interface File {
  _id: Types.ObjectId;
  ownerId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  pageCount: number;
  status: FileStatus;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<File>(
  {
    ownerId: { type: String, required: true },
    fileName: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    checksum: { type: String, required: true },
    pageCount: { type: Number, required: true },
    status: { type: String, enum: fileStatusValues, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

fileSchema.index({ ownerId: 1, createdAt: -1 });
fileSchema.index({ ownerId: 1, checksum: 1 }, { unique: true });

export const FileModel = models.File || model<File>("File", fileSchema);
