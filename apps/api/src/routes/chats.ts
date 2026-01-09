import { Router } from 'express'

import { create_chat } from '@/controllers/chats/create-chat'
import { get_all_chats } from '@/controllers/chats/get-all-chats'
import { get_chat_by_id } from '@/controllers/chats/get-chat-by-id'
import { get_chat_messages } from '@/controllers/chats/get-chat-messages'
import { stream_chat_message } from '@/controllers/chats/stream-chat-message'
import { is_authenticated } from '@/middlewares/authentication'

const router = Router()

router.use(is_authenticated)

router.post('/', create_chat)

router.get('/', get_all_chats)

router.get('/:_id', get_chat_by_id)

router.get('/:_id/messages', get_chat_messages)

router.post('/:_id/messages/stream', stream_chat_message)

export { router as chat_router }
