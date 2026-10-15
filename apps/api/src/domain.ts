export type Json = Record<string, unknown>
export type Skill = 'ee' | 'eo' | 'ce' | 'co'
export type TrainingMode = 'learn' | 'guided' | 'exam'
export type AttemptState = 'draft' | 'submitted' | 'evaluated'
export type AiOperation = 'correction' | 'evaluation' | 'vocabulary'
export type AiJobState = 'queued' | 'running' | 'completed' | 'failed'

export interface AttemptInput {
  skill: Skill
  task: number
  mode: TrainingMode
  promptId: string
  promptVersion: number
  response: Json
  metadata: Json
}

export interface Attempt extends AttemptInput {
  id: string
  state: AttemptState
  version: number
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AttemptPage {
  items: Attempt[]
  nextCursor: string | null
}

export interface AttemptRepository {
  list(userId: string, cursor?: string, limit?: number): Promise<AttemptPage>
  create(userId: string, input: AttemptInput, idempotencyKey: string): Promise<Attempt>
  get(userId: string, id: string): Promise<Attempt | null>
  update(userId: string, id: string, version: number, response: Json, metadata: Json): Promise<Attempt>
  submit(userId: string, id: string, idempotencyKey: string): Promise<Attempt>
  delete(userId: string, id: string): Promise<boolean>
}

export interface AiJob {
  id: string
  operation: AiOperation
  state: AiJobState
  result: Json | null
  safeErrorCode: string | null
  promptVersion: string
  provider: string
  model: string
  createdAt: Date
  updatedAt: Date
}

export interface ClaimedJob extends AiJob {
  userId: string
  attemptId: string | null
  input: Json
  attempts: number
}

export interface AiJobRepository {
  enqueue(userId: string, operation: AiOperation, input: Json, inputHash: string,
    promptVersion: string, provider: string, model: string, attemptId?: string): Promise<{ job: AiJob; cached: boolean }>
  getJob(userId: string, id: string): Promise<AiJob | null>
  countToday(userId: string): Promise<number>
  claim(): Promise<ClaimedJob | null>
  complete(id: string, result: Json, usage?: Json): Promise<void>
  retryOrFail(id: string, retry: boolean, maxAttempts: number, code: string, delayMs: number): Promise<void>
  close(): Promise<void>
}
