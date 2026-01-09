import path from 'path'

type TEnv = {
  api_port: number
  file_storage_dir: string
  openai_api_key: string | 'NA'
  mongodb_uri: string | 'NA'
}

export const env: TEnv = {
  api_port: parseInt(process.env.API_PORT || '5000'),
  file_storage_dir: process.env.FILE_STORAGE_DIR
    ? path.resolve(process.env.FILE_STORAGE_DIR)
    : path.resolve(process.cwd(), 'storage'),
  openai_api_key: process.env.OPENAI_API_KEY || 'NA',
  mongodb_uri: process.env.MONGODB_URI || 'NA'
}
