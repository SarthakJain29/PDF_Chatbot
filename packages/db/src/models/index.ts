import { user_model } from "./user";
import { file_model } from "./file";
import { file_page_model } from "./file-page";
import { chat_model } from "./chat";
import { message_model } from "./message";

import type { TMg } from "../types";

export const mg: TMg = {
  user: user_model,
  file: file_model,
  file_page: file_page_model,
  chat: chat_model,
  message: message_model,
};
