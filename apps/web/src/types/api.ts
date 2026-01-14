export type TChatTitlePayload = {
  chat_id: string;
  title: string;
};

export type TChatStreamHandlers = {
  on_delta: (_text: string) => void;
  on_sources: (_sources: any[]) => void;
  on_done: (_text: string) => void;
  on_error: (_message: string) => void;
  on_title?: (_payload: TChatTitlePayload) => void;
};

export type TFileStreamHandlers<TFile = unknown> = {
  on_snapshot: (_files: TFile[]) => void;
  on_update: (_file: TFile) => void;
  on_error?: (_message: string) => void;
};
