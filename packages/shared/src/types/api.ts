import type { TFileStatus } from "./models";

export type TApiResponse<T> = {
  message: string;
  data: T;
};

export type TUploadResult = {
  file_id?: string;
  file_name: string;
  status: "uploaded" | "failed";
  error?: string;
};

export type TFileUpdatePayload = {
  _id: string;
  file_name: string;
  status: TFileStatus;
};
