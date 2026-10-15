import 'dotenv/config'
import { buildApp } from './app.js'
import { createAuth0Verifier } from './auth/verifier.js'
import { loadConfig } from './config.js'
import { PostgresUserRepository } from './db/users.js'
import { PostgresLearningRepository } from './db/learning.js'

const config = loadConfig()
const users = new PostgresUserRepository(config.DATABASE_URL)
const learning = new PostgresLearningRepository(config.DATABASE_URL)
const app = buildApp({ config, users, attempts:learning, jobs:learning, verifyToken: createAuth0Verifier(config) })
let stopping = false

async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  app.log.info({ signal }, 'shutting down')
  const forced = setTimeout(() => process.exit(1), 10_000).unref()
  try { await app.close(); await users.close(); await learning.close(); clearTimeout(forced); process.exit(0) }
  catch (error) { app.log.error({ err: error }, 'shutdown failed'); process.exit(1) }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))

try { await app.listen({ host: config.HOST, port: config.PORT }) }
catch (error) { app.log.fatal({ err: error }, 'startup failed'); await users.close(); process.exit(1) }
