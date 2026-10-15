import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PostgresLearningRepository } from '../src/db/learning.js'
import type { AttemptInput } from '../src/domain.js'

const databaseUrl = process.env.TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip

suite('PostgreSQL learning repository', () => {
  const pool = new pg.Pool({ connectionString: databaseUrl })
  const repository = new PostgresLearningRepository(databaseUrl!)
  let firstUserId: string
  let secondUserId: string

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE vocabulary_packs, idempotency_keys, ai_jobs, attempts, users CASCADE',
    )
    const users = await pool.query<{ id: string }>(`
      INSERT INTO users (auth_subject)
      VALUES ('auth0|first'), ('auth0|second')
      RETURNING id
    `)
    firstUserId = users.rows[0]!.id
    secondUserId = users.rows[1]!.id
  })

  afterAll(async () => {
    await repository.close()
    await pool.end()
  })

  function input(responseText = 'Bonjour'): AttemptInput {
    return {
      skill: 'ee',
      task: 1,
      mode: 'guided',
      promptId: 'ee-task-1',
      promptVersion: 1,
      response: { text: responseText },
      metadata: { instruction: 'Écrivez un message.' },
    }
  }

  it('isolates attempts by owner and enforces idempotency and versions', async () => {
    const first = await repository.create(firstUserId, input(), 'create-first')
    const repeated = await repository.create(firstUserId, input(), 'create-first')
    const second = await repository.create(secondUserId, input(), 'create-first')

    expect(repeated.id).toBe(first.id)
    expect(second.id).not.toBe(first.id)
    expect(await repository.get(secondUserId, first.id)).toBeNull()
    await expect(
      repository.create(firstUserId, input('Different'), 'create-first'),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 })

    const updated = await repository.update(
      firstUserId,
      first.id,
      first.version,
      { text: 'Texte révisé' },
      first.metadata,
    )
    expect(updated.version).toBe(first.version + 1)
    await expect(
      repository.update(firstUserId, first.id, first.version, first.response, first.metadata),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', statusCode: 409 })

    const submitted = await repository.submit(firstUserId, first.id, 'submit-first')
    const repeatedSubmit = await repository.submit(firstUserId, first.id, 'submit-first')
    expect(submitted.state).toBe('submitted')
    expect(repeatedSubmit.id).toBe(first.id)
    await expect(
      repository.update(firstUserId, first.id, submitted.version, first.response, first.metadata),
    ).rejects.toMatchObject({ code: 'INVALID_STATE', statusCode: 409 })
  })

  it('isolates, deduplicates, claims, and redacts AI jobs', async () => {
    const inputHash = randomUUID()
    const first = await repository.enqueue(
      firstUserId,
      'correction',
      { text: 'Texte privé' },
      inputHash,
      'correction-v1',
      'mock',
      'mock-local',
    )
    const duplicate = await repository.enqueue(
      firstUserId,
      'correction',
      { text: 'Texte privé' },
      inputHash,
      'correction-v1',
      'mock',
      'mock-local',
    )

    expect(duplicate.job.id).toBe(first.job.id)
    expect(await repository.getJob(secondUserId, first.job.id)).toBeNull()
    expect(await repository.countToday(firstUserId)).toBe(1)

    const claimed = await repository.claim()
    expect(claimed).toMatchObject({ id: first.job.id, userId: firstUserId, attempts: 1 })
    expect(claimed?.input).toEqual({ text: 'Texte privé' })

    await repository.complete(first.job.id, { fullyCorrected: 'Texte privé.' })
    expect(await repository.getJob(firstUserId, first.job.id)).toMatchObject({
      state: 'completed',
      result: { fullyCorrected: 'Texte privé.' },
    })
    const stored = await pool.query<{ input: unknown }>(
      'SELECT input FROM ai_jobs WHERE id = $1',
      [first.job.id],
    )
    expect(stored.rows[0]!.input).toBeNull()
  })
})
