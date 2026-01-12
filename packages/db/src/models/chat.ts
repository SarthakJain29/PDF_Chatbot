import { Schema, model } from "mongoose";
import type { TChat } from "@my-scope/shared/types";

const chat_schema = new Schema<TChat>(
  {
    user: { type: String, required: true },
    title: { type: String, required: true },
    message_count: { type: Number, required: true, default: 0 },
    last_message_at: { type: Date, required: true, default: Date.now },
    summary: { type: String },
    summary_updated_at: { type: Date },
    archived_at: { type: Date },
  },
  { timestamps: true }
);

// Indexes for Chats
chat_schema.index({ user: 1, updatedAt: -1 }); // Primary filter - user's chats sorted by update time

export const chat_model = model<TChat>("Chat", chat_schema, "chats");
