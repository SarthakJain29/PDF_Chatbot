import { Schema, model, models, Types } from "mongoose";

export interface RagRunResult {
  chunkId: Types.ObjectId;
  score: number;
  pageNumber: number;
}

export interface RagRun {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  ownerId: string;
  query: string;
  fileIds: Types.ObjectId[];
  topK: number;
  rawResults: RagRunResult[];
  finalResults: RagRunResult[];
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
  createdAt: Date;
}

const ragRunResultSchema = new Schema<RagRunResult>(
  {
    chunkId: { type: Schema.Types.ObjectId, required: true, ref: "Chunk" },
    score: { type: Number, required: true },
    pageNumber: { type: Number, required: true },
  },
  { _id: false }
);

const ragRunSchema = new Schema<RagRun>(
  {
    chatId: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    ownerId: { type: String, required: true },
    query: { type: String, required: true },
    fileIds: { type: [{ type: Schema.Types.ObjectId, ref: "File" }], default: [] },
    topK: { type: Number, required: true },
    rawResults: { type: [ragRunResultSchema], default: [] },
    finalResults: { type: [ragRunResultSchema], default: [] },
    model: { type: String, required: true },
    fallbackUsed: { type: Boolean, required: true, default: false },
    latencyMs: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

ragRunSchema.index({ chatId: 1, createdAt: -1 });

export const RagRunModel = models.RagRun || model<RagRun>("RagRun", ragRunSchema);
