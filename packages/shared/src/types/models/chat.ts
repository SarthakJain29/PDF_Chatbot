import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

// Chat types
export type TChat<TChatUser = string> = {
  user: TChatUser;
  title: string;
  message_count: number;
  last_message_at: Date;
  archived_at?: Date;
};

export type TChatDoc<TId = TObjectId, TChatUser = string> = TDocument<TId> & TChat<TChatUser>;

export type TChatModel<TChatUser = string> = Model<TChat<TChatUser>>;