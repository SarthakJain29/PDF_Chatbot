import type { Types } from "mongoose";

export type TRagChunk = {
  _id: Types.ObjectId;
  file_id: Types.ObjectId;
  file_name: string;
  page_number: number;
  chunk_index: number;
  text: string;
  score: number;
};

export type TFindChunksParams = {
  user?: string;
  embedding: number[];
  query?: string;
  limit?: number;
};
