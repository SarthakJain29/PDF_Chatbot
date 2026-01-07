import type { Types } from "mongoose";

export type TObjectId = Types.ObjectId;

export type TDocument<TId = TObjectId> = {
  _id: TId;
  createdAt: Date;
  updatedAt: Date;
};
