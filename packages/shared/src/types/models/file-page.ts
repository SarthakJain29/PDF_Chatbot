import { Types } from "mongoose";

// FilePage types (renamed from Chunk)
export type FilePage = {
  _id: Types.ObjectId;
  owner_id: string;
  file_id: Types.ObjectId;
  page_number: number;
  chunk_index: number;
  text: string;
  embedding: number[];
  created_at: Date;
};
