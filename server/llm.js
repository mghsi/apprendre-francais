// Shared LLM provider helper used by the /api endpoints.
//
// Provider selection (in priority order):
//   1. DEEPSEEK_API_KEY        – DeepSeek (OpenAI-compatible chat API).
//   2. CLAUDE_CODE_OAUTH_TOKEN – Anthropic OAuth token (sk-ant-oat…).
//   3. ANTHROPIC_API_KEY       – Anthropic pay-per-token API key.
//
// All callers ask the model for a single JSON object. This helper returns
// a *complete* JSON string (leading "{" included) plus a stop reason, so
// the callers only have to JSON.parse() the result.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const ANTHROPIC_MODEL =
  process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

// DeepSeek's chat models cap output at 8192 tokens.
const DEEPSEEK_MAX_TOKENS = 8192

const CLAUDE_CODE_IDENTITY =
  "You are Claude Code, Anthropic's official CLI for Claude."

export function selectProvider() {
  if (process.env.DEEPSEEK_API_KEY) {
    return { provider: 'deepseek', token: process.env.DEEPSEEK_API_KEY }
  }
  const claudeToken =
    process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY || ''
  if (claudeToken) {
    return { provider: 'anthropic', token: claudeToken }
  }
  return { provider: null, token: '' }
}

// Calls the active provider and returns { text, stopReason } where `text`
// is a complete JSON document.
//
// opts:
//   system      – the domain system instruction (string)
//   userContent – the user message (string)
//   maxTokens   – desired output token budget
//   temperature – sampling temperature
export async function chatJson({ system, userContent, maxTokens, temperature }) {
  const { provider, token } = selectProvider()
  if (!provider) {
    throw new Error(
      'Aucun token LLM trouvé. Définis DEEPSEEK_API_KEY, ' +
        'CLAUDE_CODE_OAUTH_TOKEN ou ANTHROPIC_API_KEY dans ton environnement.'
    )
  }
  if (provider === 'deepseek') {
    return callDeepSeek({ token, system, userContent, maxTokens, temperature })
  }
  return callAnthropic({ token, system, userContent, maxTokens, temperature })
}

async function callDeepSeek({ token, system, userContent, maxTokens, temperature }) {
  const body = {
    model: DEEPSEEK_MODEL,
    max_tokens: Math.min(maxTokens || DEEPSEEK_MAX_TOKENS, DEEPSEEK_MAX_TOKENS),
    temperature: temperature ?? 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  }
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(
      `DeepSeek API ${res.status} ${res.statusText}: ${errBody.slice(0, 400)}`
    )
  }
  const json = await res.json()
  const choice = json?.choices?.[0]
  // DeepSeek (OpenAI-compatible) returns the complete JSON object already.
  const text = choice?.message?.content ?? ''
  const stopReason = choice?.finish_reason === 'length' ? 'max_tokens' : choice?.finish_reason
  return { text, stopReason }
}

async function callAnthropic({ token, system, userContent, maxTokens, temperature }) {
  const isOAuth = token.startsWith('sk-ant-oat')
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
  }
  if (isOAuth) {
    headers['authorization'] = `Bearer ${token}`
    headers['anthropic-beta'] = 'oauth-2025-04-20'
  } else {
    headers['x-api-key'] = token
  }
  // When using an OAuth token, the system prompt must start with the
  // Claude Code identity sentence (sent as text blocks).
  const systemField = isOAuth
    ? [
        { type: 'text', text: CLAUDE_CODE_IDENTITY },
        { type: 'text', text: system },
      ]
    : system
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens || 8000,
    temperature: temperature ?? 0,
    system: systemField,
    messages: [
      { role: 'user', content: userContent },
      // Prefill the assistant turn with "{" so the model emits raw JSON.
      { role: 'assistant', content: '{' },
    ],
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(
      `Anthropic API ${res.status} ${res.statusText}: ${errBody.slice(0, 400)}`
    )
  }
  const json = await res.json()
  const piece = json?.content?.[0]?.text ?? ''
  const stopReason = json?.stop_reason
  // The prefilled "{" is not echoed back, so we add it to complete the JSON.
  return { text: '{' + piece, stopReason }
}

// Extract the first balanced JSON object from a string. Useful when a model
// wraps the JSON in extra prose despite being asked not to.
export function extractJsonObject(text) {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
    } else {
      if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return text.slice(start, i + 1)
      }
    }
  }
  return null
}
