import { Schema, model, models, Types } from "mongoose";

export interface Chat {
  _id: Types.ObjectId;
  ownerId: string;
  title: string;
  fileIds: Types.ObjectId[];
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  archivedAt?: Date;
}

const chatSchema = new Schema<Chat>(
  {
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    fileIds: { type: [{ type: Schema.Types.ObjectId, ref: "File" }], default: [] },
    messageCount: { type: Number, required: true, default: 0 },
    lastMessageAt: { type: Date, required: true, default: Date.now },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chatSchema.index({ ownerId: 1, updatedAt: -1 });

export const ChatModel = models.Chat || model<Chat>("Chat", chatSchema);
