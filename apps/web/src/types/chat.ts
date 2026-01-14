import type { TChatDoc } from "@my-scope/shared/types";

export type TChatListItem = Pick<TChatDoc<string>, "_id" | "title" | "message_count">;

export type TChatMessageDoc = {
  _id: string;
  role: "user" | "assistant";
  content: string | { text: string };
};

export type TChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type TChatPageProps = {
  params: { chatId: string };
};

export type TChatSidebarProps = {
  chats: TChatListItem[];
  active_chat_id?: string;
  on_new_chat: () => void;
  on_select_chat: (_chat_id: string) => void;
  is_open: boolean;
  on_toggle: () => void;
};
