import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

export type TUser = {
  email: string;
  display_name: string;
  photo_url?: string;
};

export type TUserDoc<TId = string> = TDocument<TId> & TUser;

export type TUserModel = Model<TUser>;
