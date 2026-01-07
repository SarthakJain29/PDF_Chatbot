import { Schema, model, models } from "mongoose";
import type { User } from "@my-scope/shared/types";

const userSchema = new Schema<User>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    display_name: { type: String, required: true, trim: true },
    photo_url: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

export const UserModel = models.User || model<User>("User", userSchema);
