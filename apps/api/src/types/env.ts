export type TEnv = {
  api_port: number;
  file_storage_dir: string;
  openai_api_key: string | "NA";
  mongodb_uri: string | "NA";
  cloudinary_cloud_name: string | "NA";
  cloudinary_api_key: string | "NA";
  cloudinary_api_secret: string | "NA";
};
