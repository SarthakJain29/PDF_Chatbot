import colors from 'colors'

import { connect_db, disconnect_db } from '@my-scope/db'

import { env } from '@/constants/env'

import { app } from './app'

colors.enable()

const start_server = async () => {
  try {
    const connected = await connect_db()
    if (!connected) {
      console.warn('Warning: Database connection failed. Server will start without database.'.yellow)
    }

    app.listen(env.api_port, () => {
      console.log(`Server is live on: http://localhost:${env.api_port}`.magenta)
      if (!connected) {
        console.warn('Note: Some features may not work without database connection.'.yellow)
      }
    })
  } catch (error) {
    console.error('Failed to start server...\n'.red, error)
    process.exit(1)
  }
}

const graceful_shutdown = async () => {
  try {
    console.log('Shutting down gracefully...\n'.yellow)
    await disconnect_db()
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown...\n'.red, error)
    process.exit(1)
  }
}

const handle_fatal_error = (error: Error, type: 'rejection' | 'exception') => {
  console.error(`Shutting down due to unhandled ${type}...\n`.red, error)
  graceful_shutdown()
}

start_server()

process.on('SIGTERM', graceful_shutdown)
process.on('SIGINT', graceful_shutdown)

process.on('unhandledRejection', (error: Error) => {
  handle_fatal_error(error, 'rejection')
})

process.on('uncaughtException', (error: Error) => {
  handle_fatal_error(error, 'exception')
})
