import { Types } from "mongoose";

// Chat types
export type Chat = {
  _id: Types.ObjectId;
  owner_id: string;
  title: string;
  message_count: number;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
  archived_at?: Date;
};
