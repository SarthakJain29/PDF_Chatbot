import { Schema, model } from "mongoose";
import type { TMessage } from "@my-scope/shared/types";
import { messageRoleValues, messageStatusValues } from "@my-scope/shared/types";

const message_schema = new Schema<TMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    user: { type: String, required: true },
    role: { type: String, enum: messageRoleValues, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: messageStatusValues, required: true },
    model: { type: String, required: true },
    retry_attempts: { type: Number, required: true, default: 0 },
    error: { type: String },
  },
  { timestamps: true }
);

// Indexes for Messages
message_schema.index({ chat: 1, createdAt: 1 }); // Primary filter - messages for a chat sorted by creation

export const message_model = model<TMessage>("Message", message_schema, "messages");
