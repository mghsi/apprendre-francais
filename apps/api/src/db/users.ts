import pg from 'pg'
import type { Identity, User, UserRepository } from '../types.js'

const { Pool } = pg
type Row = { id: string; preferences: User['preferences']; status: User['status']; created_at: Date }
const map = (row: Row): User => ({ id: row.id, preferences: row.preferences, status: row.status, createdAt: row.created_at })

export class PostgresUserRepository implements UserRepository {
  readonly #pool: pg.Pool
  constructor(connectionString: string) { this.#pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 }) }

  async provision(identity: Identity): Promise<User> {
    const client = await this.#pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query<Row>(`
        INSERT INTO users (auth_subject, email, email_verified, display_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (auth_subject) DO UPDATE SET
          email = EXCLUDED.email, email_verified = EXCLUDED.email_verified,
          display_name = EXCLUDED.display_name, updated_at = now()
        RETURNING id, preferences, status, created_at`,
      [identity.subject, identity.email ?? null, identity.emailVerified, identity.displayName ?? null])
      await client.query('COMMIT')
      return map(result.rows[0]!)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  }

  async updatePreferences(userId: string, preferences: User['preferences']): Promise<User> {
    const result = await this.#pool.query<Row>(
      'UPDATE users SET preferences = $2, updated_at = now() WHERE id = $1 AND status = \'active\' RETURNING id, preferences, status, created_at',
      [userId, preferences])
    if (!result.rows[0]) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'NOT_FOUND' })
    return map(result.rows[0])
  }

  async requestDeletion(userId: string): Promise<void> {
    const client = await this.#pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `UPDATE users
         SET status = 'deletion_pending', email = NULL, display_name = NULL,
             updated_at = now()
         WHERE id = $1 AND status = 'active'`,
        [userId],
      )
      if (result.rowCount !== 1) {
        throw Object.assign(new Error('User not found'), {
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      }
      await client.query('DELETE FROM attempts WHERE user_id = $1', [userId])
      await client.query('DELETE FROM ai_jobs WHERE user_id = $1', [userId])
      await client.query('DELETE FROM idempotency_keys WHERE user_id = $1', [userId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async ping(): Promise<void> { await this.#pool.query('SELECT 1') }
  async close(): Promise<void> { await this.#pool.end() }
}
