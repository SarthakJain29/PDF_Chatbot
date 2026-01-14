import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

export const messageRoleValues = ["user", "assistant", "system", "tool"] as const;
export type TMessageRole = (typeof messageRoleValues)[number];

export const messageStatusValues = ["streaming", "complete", "error"] as const;
export type TMessageStatus = (typeof messageStatusValues)[number];

export type TMessageSource<TFileId = TObjectId> = {
  file_id: TFileId;
  file_name: string;
  page_number: number;
  chunk_index: number;
};

export type TMessageContent<TFileId = TObjectId> =
  | string
  | {
      text: string;
      sources?: TMessageSource<TFileId>[];
    };

export type TMessage<TMessageChat = TObjectId, TMessageUser = string> = {
  chat: TMessageChat;
  user: TMessageUser;
  role: TMessageRole;
  content: TMessageContent;
  status: TMessageStatus;
  model: string;
  retry_attempts: number;
  error?: string;
};

export type TMessageDoc<TId = TObjectId, TMessageChat = TObjectId, TMessageUser = string> =
  TDocument<TId> & TMessage<TMessageChat, TMessageUser>;

export type TMessageModel<TMessageChat = TObjectId, TMessageUser = string> = Model<
  TMessage<TMessageChat, TMessageUser>
>;
