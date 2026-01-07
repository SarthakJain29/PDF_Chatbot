import { Schema, model, models, Types } from "mongoose";

export interface Chunk {
  _id: Types.ObjectId;
  ownerId: string;
  fileId: Types.ObjectId;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  overlapTokens: number;
  embedding: number[];
  dedupeKey: string;
  createdAt: Date;
}

const chunkSchema = new Schema<Chunk>(
  {
    ownerId: { type: String, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true, ref: "File" },
    pageNumber: { type: Number, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    tokenCount: { type: Number, required: true },
    overlapTokens: { type: Number, required: true },
    embedding: { type: [Number], required: true },
    dedupeKey: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

chunkSchema.index({ fileId: 1 });
chunkSchema.index({ ownerId: 1 });
chunkSchema.index({ dedupeKey: 1 });

export const chunkVectorIndex = {
  name: "chunks_embedding",
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
export const ChunkModel = models.Chunk || model<Chunk>("Chunk", chunkSchema);
