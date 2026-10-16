import { authState, getAccessToken } from './auth.js'

const apiOrigin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, { code = 'API_ERROR', status = 0, requestId = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
  }
}

export async function apiRequest(path, { anonymous = false, ...options } = {}) {
  const token = anonymous ? null : await getAccessToken()
  const response = await fetch(`${apiOrigin}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = response.status === 204
    ? null
    : await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      (response.status === 429 && anonymous
        ? 'Limite quotidienne de corrections sans connexion atteinte. Connecte-toi ou réessaie demain.'
        : payload?.message) || `La requête a échoué (${response.status}).`,
      {
        code: payload?.code,
        status: response.status,
        requestId: payload?.requestId || response.headers.get('x-request-id') || '',
      },
    )
  }
  return payload
}

const aiPaths = {
  correction: '/v1/ai/corrections',
  evaluation: '/v1/ai/evaluations',
  vocabulary: '/v1/ai/vocabulary',
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runAiOperation(operation, input, { timeoutMs = 90_000 } = {}) {
  // Corrections also work signed out; the API runs them synchronously with a per-IP cap.
  if (operation === 'correction' && !authState.authenticated) {
    const response = await apiRequest('/v1/public/ai/corrections', {
      method: 'POST',
      body: JSON.stringify(input),
      anonymous: true,
    })
    return response.result
  }

  const created = await apiRequest(aiPaths[operation], {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (created.state === 'completed') return created.result

  const deadline = Date.now() + timeoutMs
  let delay = 500
  while (Date.now() < deadline) {
    await wait(delay)
    const job = await apiRequest(`/v1/ai/jobs/${created.jobId}`)
    if (job.state === 'completed') return job.result
    if (job.state === 'failed') {
      throw new ApiError(job.error?.message || 'Le traitement IA a échoué.', {
        code: job.error?.code || 'AI_PROCESSING_FAILED',
      })
    }
    delay = Math.min(Math.round(delay * 1.5), 3_000)
  }
  throw new ApiError('Le traitement prend plus de temps que prévu. Réessayez dans un instant.', {
    code: 'AI_TIMEOUT',
  })
}
