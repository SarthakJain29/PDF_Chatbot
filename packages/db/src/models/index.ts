import type {
  TUser,
  TFile,
  TFilePage,
  TChat,
  TMessage,
} from "@my-scope/shared/types";

import { user_model } from "./user";
import { file_model } from "./file";
import { file_page_model } from "./file-page";
import { chat_model } from "./chat";
import { message_model } from "./message";

type TMg = {
  user: typeof user_model;
  file: typeof file_model;
  file_page: typeof file_page_model;
  chat: typeof chat_model;
  message: typeof message_model;
};

export const mg: TMg = {
  user: user_model,
  file: file_model,
  file_page: file_page_model,
  chat: chat_model,
  message: message_model,
};
