import type { TFileDoc } from "@my-scope/shared/types";

export type TFileListItem = Pick<TFileDoc<string>, "_id" | "file_name" | "status">;

export type TFilePanelProps = {
  files: TFileListItem[];
  on_upload_click?: () => void;
  is_uploading?: boolean;
};
