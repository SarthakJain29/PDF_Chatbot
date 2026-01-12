import { Router } from 'express'

import { list_files } from '@/controllers/files/list-files'
import { stream_files } from '@/controllers/files/stream-files'
import { upload_files } from '@/controllers/files/upload-files'
import { is_authenticated } from '@/middlewares/authentication'

const router = Router()

router.use(is_authenticated)

router.get('/', list_files)
router.get('/stream', stream_files)
router.post('/upload', upload_files)

export { router as file_router }
