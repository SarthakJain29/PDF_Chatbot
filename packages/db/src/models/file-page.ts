import { Schema, model, models } from "mongoose";
import type { FilePage } from "@my-scope/shared/types";

const filePageSchema = new Schema<FilePage>(
  {
    owner_id: { type: String, required: true },
    file_id: { type: Schema.Types.ObjectId, required: true, ref: "File" },
    page_number: { type: Number, required: true },
    chunk_index: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

filePageSchema.index({ file_id: 1 });
filePageSchema.index({ owner_id: 1 });

export const filePageVectorIndex = {
  name: "file_pages_embedding",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 1536,
        similarity: "cosine",
      },
    ],
  },
};

// Atlas vector index should be created separately for `embedding`.
export const FilePageModel = models.FilePage || model<FilePage>("FilePage", filePageSchema);
