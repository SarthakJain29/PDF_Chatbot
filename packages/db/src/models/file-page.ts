import { Schema, model } from "mongoose";
import type { TFilePage } from "@my-scope/shared/types";

const file_page_schema = new Schema<TFilePage>(
  {
    user: { type: String, required: true },
    file: {
      type: Schema.Types.ObjectId,
      ref: "File",
      required: true,
    },
    page_number: { type: Number, required: true },
    chunk_index: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

// Indexes for FilePages
file_page_schema.index({ file: 1 }); // Primary filter - pages for a file
file_page_schema.index({ user: 1 }); // User-filtered queries

export const file_page_vector_index = {
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
export const file_page_model = model<TFilePage>("FilePage", file_page_schema, "file_pages");
