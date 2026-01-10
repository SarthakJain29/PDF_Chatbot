import { Router } from 'express'

import { upload_files } from '@/controllers/files/upload-files'
import { is_authenticated } from '@/middlewares/authentication'

const router = Router()

router.use(is_authenticated)

router.post('/upload', upload_files)

export { router as file_router }
