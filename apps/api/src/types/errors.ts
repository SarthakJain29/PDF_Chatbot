export type TApiError = {
  message: string;
  status_code: number;
  validation_error?: {
    fields: string[];
    details: Array<{ field: string; message: string; code: string }>;
  };
  stack?: string;
};
