import { Schema, model, models, Types } from "mongoose";

export const messageRoleValues = ["user", "assistant", "system", "tool"] as const;
export type MessageRole = (typeof messageRoleValues)[number];

export const messageStatusValues = ["streaming", "complete", "error"] as const;
export type MessageStatus = (typeof messageStatusValues)[number];

export interface MessageSource {
  chunkId: Types.ObjectId;
  fileId: Types.ObjectId;
  pageNumber: number;
  score: number;
}

export interface Message {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  ownerId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  model: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: Date;
  sources: MessageSource[];
  retryAttempts: number;
  fallbackModels: string[];
  error?: string;
}

const messageSourceSchema = new Schema<MessageSource>(
  {
    chunkId: { type: Schema.Types.ObjectId, required: true, ref: "Chunk" },
    fileId: { type: Schema.Types.ObjectId, required: true, ref: "File" },
    pageNumber: { type: Number, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema<Message>(
  {
    chatId: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
    ownerId: { type: String, required: true },
    role: { type: String, enum: messageRoleValues, required: true },
    content: { type: String, required: true },
    status: { type: String, enum: messageStatusValues, required: true },
    model: { type: String, required: true },
    tokensIn: { type: Number, required: true, default: 0 },
    tokensOut: { type: Number, required: true, default: 0 },
    sources: { type: [messageSourceSchema], default: [] },
    retryAttempts: { type: Number, required: true, default: 0 },
    fallbackModels: { type: [String], default: [] },
    error: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

messageSchema.index({ chatId: 1, createdAt: 1 });

export const MessageModel = models.Message || model<Message>("Message", messageSchema);
