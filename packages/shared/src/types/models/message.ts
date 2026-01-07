import { Types } from "mongoose";

// Message types
export const messageRoleValues = ["user", "assistant", "system", "tool"] as const;
export type MessageRole = (typeof messageRoleValues)[number];

export const messageStatusValues = ["streaming", "complete", "error"] as const;
export type MessageStatus = (typeof messageStatusValues)[number];

export type Message = {
  _id: Types.ObjectId;
  chat_id: Types.ObjectId;
  owner_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  model: string;
  created_at: Date;
  retry_attempts: number;
  error?: string;
};
