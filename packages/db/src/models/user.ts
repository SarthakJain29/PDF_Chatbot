import { Schema, model } from "mongoose";
import type { TUser } from "@my-scope/shared/types";

const user_schema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    display_name: { type: String, required: true, trim: true },
    photo_url: { type: String },
  },
  { timestamps: true }
);

export const user_model = model<TUser>("User", user_schema, "users");
