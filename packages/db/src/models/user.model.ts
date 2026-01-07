import { Schema, model, models } from "mongoose";

export interface User {
  _id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
}

const userSchema = new Schema<User>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    photoURL: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

export const UserModel = models.User || model<User>("User", userSchema);
