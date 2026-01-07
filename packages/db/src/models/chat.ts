import { Schema, model, models } from "mongoose";
import type { Chat } from "@my-scope/shared/types";

const chatSchema = new Schema<Chat>(
  {
    owner_id: { type: String, required: true },
    title: { type: String, required: true },
    file_ids: { type: [{ type: Schema.Types.ObjectId, ref: "File" }], default: [] },
    message_count: { type: Number, required: true, default: 0 },
    last_message_at: { type: Date, required: true, default: Date.now },
    archived_at: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

chatSchema.index({ owner_id: 1, updated_at: -1 });

export const ChatModel = models.Chat || model<Chat>("Chat", chatSchema);
