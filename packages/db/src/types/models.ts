import type { user_model } from "../models/user";
import type { file_model } from "../models/file";
import type { file_page_model } from "../models/file-page";
import type { chat_model } from "../models/chat";
import type { message_model } from "../models/message";

export type TMg = {
  user: typeof user_model;
  file: typeof file_model;
  file_page: typeof file_page_model;
  chat: typeof chat_model;
  message: typeof message_model;
};
