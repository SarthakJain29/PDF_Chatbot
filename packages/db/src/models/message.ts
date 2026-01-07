import { Schema, model, models } from "mongoose";
import type { Message, MessageRole, MessageStatus } from "@my-scope/shared/types";
import { messageRoleValues, messageStatusValues } from "@my-scope/shared/types";

const messageSchema = new Schema<Message>(
  {
    chat_id: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    owner_id: { type: String, required: true },
    role: { type: String, enum: messageRoleValues, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: messageStatusValues, required: true },
    model: { type: String, required: true },
    retry_attempts: { type: Number, required: true, default: 0 },
    error: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

messageSchema.index({ chat_id: 1, created_at: 1 });

export const MessageModel = models.Message || model<Message>("Message", messageSchema);
