import express, {
  json,
  NextFunction,
  Request,
  Response,
  urlencoded
} from 'express'

import 'express-async-errors'

import fileUpload from 'express-fileupload'
import cors from 'cors'
import morgan from 'morgan'

import { get_db_status } from '@my-scope/db'

import { chat_router } from '@/routes/chats'
import { file_router } from '@/routes/files'
import { error_handler } from '@/middlewares/error-handler'
import { success_handler } from '@/middlewares/success-handler'
import { throw_error } from '@/utils/throw-error'

const app = express()

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  })
)
app.use(json({ limit: '50mb' }))
app.use(urlencoded({ limit: '50mb', extended: true }))
app.use(morgan('dev'))
app.use(
  fileUpload({
    createParentPath: true
  })
)

app.use(success_handler)

app.get('/', async (_req: Request, res: Response) => {
  const health_data = {
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    db_status: get_db_status(),
    timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
  }

  res.json({
    message: 'RAG Chatbot API Service - Health Check',
    data: health_data
  })
})

app.use('/api/v1/files', file_router)
app.use('/api/v1/chats', chat_router)

app.all('*', (req: Request, _res: Response, _next: NextFunction) => {
  throw_error(`Route '${req.originalUrl}' not found`, 404)
})

app.use(error_handler)

export { app }
