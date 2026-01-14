export type TSseHandlers = {
  delta?: (_data: { text: string }) => void;
  sources?: (_data: { sources: Array<Record<string, unknown>> }) => void;
  chat_title?: (_data: { chat_id: string; title: string }) => void;
  done?: (_data: { text: string }) => void;
  error?: (_data: { message: string }) => void;
};
