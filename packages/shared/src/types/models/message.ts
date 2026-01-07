import type { Model } from "mongoose";
import type { TDocument, TObjectId } from "./common";

// Message types
export const messageRoleValues = ["user", "assistant", "system", "tool"] as const;
export type MessageRole = (typeof messageRoleValues)[number];

export const messageStatusValues = ["streaming", "complete", "error"] as const;
export type MessageStatus = (typeof messageStatusValues)[number];

export type TMessage<TMessageChat = TObjectId, TMessageUser = string> = {
  chat: TMessageChat;
  user: TMessageUser;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  model: string;
  retry_attempts: number;
  error?: string;
};

export type TMessageDoc<TId = TObjectId, TMessageChat = TObjectId, TMessageUser = string> =
  TDocument<TId> & TMessage<TMessageChat, TMessageUser>;

export type TMessageModel<TMessageChat = TObjectId, TMessageUser = string> = Model<
  TMessage<TMessageChat, TMessageUser>
>;
