import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

// FilePage types (renamed from Chunk)
export type TFilePage<TFilePageFile = TObjectId, TFilePageUser = string> = {
  user: TFilePageUser;
  file: TFilePageFile;
  page_number: number;
  chunk_index: number;
  text: string;
  embedding: number[];
};

export type TFilePageDoc<
  TId = TObjectId,
  TFilePageFile = TObjectId,
  TFilePageUser = string
> = TDocument<TId> & TFilePage<TFilePageFile, TFilePageUser>;

export type TFilePageModel<TFilePageFile = TObjectId, TFilePageUser = string> = Model<
  TFilePage<TFilePageFile, TFilePageUser>
>;
