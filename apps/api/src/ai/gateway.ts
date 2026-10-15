import type { Config } from '../config.js'
import type { AiOperation, Json } from '../domain.js'
import { CORRECTION_PROMPT, EVALUATION_PROMPT, VOCABULARY_PROMPT } from './prompts.js'

export interface ProviderResponse {
  text: string
  usage?: Json
}

interface ProviderRequest {
  system: string
  userContent: string
  maxTokens: number
  temperature: number
  signal: AbortSignal
}

export type ProviderCall = (request: ProviderRequest) => Promise<ProviderResponse>

export class ProviderError extends Error {
  constructor(public readonly transient: boolean) {
    super('Provider request failed')
  }
}

interface UnknownObject {
  [key: string]: unknown
}

function isObject(value: unknown): value is UnknownObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringArray(value: unknown, limit: number): string[] {
  return array(value)
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .slice(0, limit)
}

export function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let index = start; index < text.length; index += 1) {
    const character = text[index]!
    if (inString) {
      if (escape) escape = false
      else if (character === '\\') escape = true
      else if (character === '"') inString = false
    } else if (character === '"') inString = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return text.slice(start, index + 1)
  }
  return null
}

function spansOverlap(first: [number, number], second: [number, number]): boolean {
  return !(first[1] <= second[0] || first[0] >= second[1])
}

export function normalizeCorrection(parsed: unknown, originalText: string): Json {
  const source = isObject(parsed) ? parsed : {}
  const errors: Array<UnknownObject & { index: number }> = []
  const errorSpans: Array<[number, number]> = []
  const seenErrors = new Set<string>()

  for (const candidate of array(source.errors)) {
    if (!isObject(candidate)) continue
    const original = typeof candidate.original === 'string' ? candidate.original : ''
    const corrected = typeof candidate.corrected === 'string' ? candidate.corrected : ''
    if (!original) continue
    const index = originalText.indexOf(original)
    if (index < 0) continue
    const dedupeKey = `${original}→${corrected}`
    if (seenErrors.has(dedupeKey)) continue
    const span: [number, number] = [index, index + original.length]
    if (errorSpans.some((existing) => spansOverlap(existing, span))) continue
    seenErrors.add(dedupeKey)
    errorSpans.push(span)
    errors.push({
      original,
      corrected,
      explanation: typeof candidate.explanation === 'string' ? candidate.explanation : '',
      type: typeof candidate.type === 'string' ? candidate.type : 'autre',
      index,
    })
  }
  errors.sort((first, second) => first.index - second.index)

  const suggestions: Array<UnknownObject & { index: number }> = []
  const suggestionSpans: Array<[number, number]> = []
  for (const candidate of array(source.suggestions)) {
    if (!isObject(candidate)) continue
    const original = typeof candidate.original === 'string' ? candidate.original : ''
    const suggested = typeof candidate.suggested === 'string' ? candidate.suggested : ''
    const explanation = typeof candidate.explanation === 'string' ? candidate.explanation : ''
    const category = typeof candidate.category === 'string' ? candidate.category : 'style'
    if (!original) {
      if (suggested || explanation) {
        suggestions.push({ original, suggested, explanation, category, index: -1 })
      }
      continue
    }
    const index = originalText.indexOf(original)
    if (index < 0) continue
    const span: [number, number] = [index, index + original.length]
    if (errorSpans.some((existing) => spansOverlap(existing, span))) continue
    if (suggestionSpans.some((existing) => spansOverlap(existing, span))) continue
    suggestionSpans.push(span)
    suggestions.push({ original, suggested, explanation, category, index })
  }
  suggestions.sort((first, second) => {
    if (first.index === -1 && second.index !== -1) return 1
    if (second.index === -1 && first.index !== -1) return -1
    return first.index - second.index
  })

  return {
    original: originalText,
    errors: errors.map(({ index: _index, ...error }) => error),
    suggestions: suggestions.slice(0, 5).map(({ index: _index, ...suggestion }) => suggestion),
    fullyCorrected: typeof source.fully_corrected === 'string'
      ? source.fully_corrected
      : originalText,
  }
}

function anchoredItems(
  value: unknown,
  text: string,
  fields: string[],
  limit: number,
): UnknownObject[] {
  return array(value).filter((item): item is UnknownObject => {
    if (!isObject(item)) return false
    if (!fields.every((field) => typeof item[field] === 'string')) return false
    return typeof item.original === 'string' && Boolean(item.original) && text.includes(item.original)
  }).slice(0, limit)
}

export function normalizeEvaluation(parsed: unknown, text: string): Json {
  const source = isObject(parsed) ? parsed : {}
  const fulfillment = isObject(source.task_fulfillment) ? source.task_fulfillment : {}
  const status = ['strong', 'partial', 'weak'].includes(string(fulfillment.status))
    ? string(fulfillment.status)
    : 'partial'
  const dimensions = array(source.dimensions)
    .filter((item): item is UnknownObject => isObject(item) && typeof item.id === 'string')
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      level: ['strong', 'developing', 'priority', 'not_assessed'].includes(string(item.level))
        ? string(item.level)
        : 'not_assessed',
      evidence: stringArray(item.evidence, 3),
      nextAction: typeof item.next_action === 'string' ? item.next_action : '',
    }))

  return {
    original: text,
    taskFulfillment: {
      status,
      evidence: stringArray(fulfillment.evidence, 4),
      missingRequirements: stringArray(fulfillment.missing_requirements, 4),
    },
    dimensions,
    strengths: stringArray(source.strengths, 3),
    priorities: stringArray(source.priorities, 3),
    retryChallenge: typeof source.retry_challenge === 'string' ? source.retry_challenge : '',
    disclaimer: 'Évaluation d’entraînement, non officielle',
    errors: anchoredItems(
      source.errors,
      text,
      ['original', 'corrected', 'explanation', 'type'],
      30,
    ),
    suggestions: anchoredItems(
      source.suggestions,
      text,
      ['original', 'suggested', 'explanation', 'category'],
      5,
    ),
    fullyCorrected: typeof source.fully_corrected === 'string'
      ? source.fully_corrected
      : text,
    evaluatorVersion: 'tcf-production-v1',
  }
}

function vocabItems(value: unknown, fields: string[]): UnknownObject[] {
  return array(value)
    .filter(isObject)
    .map((item) => Object.fromEntries(fields.map((field) => [field, string(item[field])])))
    .filter((item) => Boolean(item[fields[0]!]))
}

export function normalizeVocab(parsed: unknown, theme: string): Json {
  const source = isObject(parsed) ? parsed : {}
  return {
    theme: string(source.theme) || theme,
    level: 'B2+',
    nouns: vocabItems(source.nouns, ['term', 'definition', 'example']),
    verbs: vocabItems(source.verbs, ['term', 'construction', 'example']),
    adjectives: vocabItems(source.adjectives, ['term', 'example']),
    connectors: vocabItems(source.connectors, ['term', 'use', 'example']),
    expressions: vocabItems(source.expressions, ['term', 'register', 'example']),
    pitfalls: vocabItems(source.pitfalls, ['wrong', 'right', 'note'])
      .filter((item) => Boolean(item.wrong && item.right)),
  }
}

const operations: Record<AiOperation, {
  version: string
  system: string
  maxTokens: number
  temperature: number
}> = {
  correction: {
    version: 'correction-v1',
    system: CORRECTION_PROMPT,
    maxTokens: 16_000,
    temperature: 0,
  },
  evaluation: {
    version: 'tcf-production-v1',
    system: EVALUATION_PROMPT,
    maxTokens: 12_000,
    temperature: 0,
  },
  vocabulary: {
    version: 'eo-vocab-v1',
    system: VOCABULARY_PROMPT,
    maxTokens: 8_000,
    temperature: 0.3,
  },
}

export function promptVersion(operation: AiOperation): string {
  return operations[operation].version
}

function userContent(operation: AiOperation, input: Json): { content: string; source: string } {
  if (operation === 'vocabulary') {
    const theme = string(input.theme)
    return {
      content: `Génère un dossier lexical B2+ pour le thème suivant. Réponds en JSON strict.\n\n<<<THÈME>>>\n${theme}\n<<<FIN>>>`,
      source: theme,
    }
  }
  const text = string(input.responseText ?? input.text)
  if (operation === 'correction') {
    return {
      content: `Voici le texte à corriger. Réponds en JSON strict.\n\n<<<TEXTE>>>\n${text}\n<<<FIN>>>`,
      source: text,
    }
  }
  const context = {
    skill: input.skill,
    task: input.task,
    mode: input.mode,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    instruction: input.instruction,
    expectedCoverage: input.expectedCoverage,
    assistanceUsed: input.assistanceUsed,
  }
  return {
    content: `CONTEXTE\n${JSON.stringify(context)}\n\nRÉPONSE\n<<<${text}>>>`,
    source: text,
  }
}

function parseProviderJson(text: string): UnknownObject {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const extracted = extractJsonObject(text)
    if (!extracted) {
      throw Object.assign(new Error('Invalid provider output'), { validation: true })
    }
    try {
      parsed = JSON.parse(extracted)
    } catch {
      throw Object.assign(new Error('Invalid provider output'), { validation: true })
    }
  }
  if (!isObject(parsed)) {
    throw Object.assign(new Error('Invalid provider output'), { validation: true })
  }
  return parsed
}

export async function processOperation(
  operation: AiOperation,
  input: Json,
  call: ProviderCall,
  timeoutMs: number,
): Promise<{ result: Json; usage: Json | undefined }> {
  const settings = operations[operation]
  const request = userContent(operation, input)
  const response = await call({
    system: settings.system,
    userContent: request.content,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    signal: AbortSignal.timeout(timeoutMs),
  })
  const parsed = parseProviderJson(response.text)
  const result = operation === 'correction'
    ? normalizeCorrection(parsed, request.source)
    : operation === 'evaluation'
      ? normalizeEvaluation(parsed, request.source)
      : normalizeVocab(parsed, request.source)
  return { result, usage: response.usage }
}

interface AnthropicResponse {
  content?: Array<{ text?: string }>
  usage?: Json
}

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: Json
}

export function createProvider(config: Config): ProviderCall {
  return async (request) => {
    if (config.LLM_PROVIDER === 'mock') throw new ProviderError(false)
    const anthropic = config.LLM_PROVIDER === 'anthropic'
    const url = anthropic
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://api.deepseek.com/chat/completions'
    const body = anthropic
      ? {
          model: config.LLM_MODEL,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          system: request.system,
          messages: [
            { role: 'user', content: request.userContent },
            { role: 'assistant', content: '{' },
          ],
        }
      : {
          model: config.LLM_MODEL,
          max_tokens: Math.min(request.maxTokens, 8_192),
          temperature: request.temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.userContent },
          ],
        }
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(anthropic
            ? {
                'x-api-key': config.LLM_API_KEY,
                'anthropic-version': '2023-06-01',
              }
            : { authorization: `Bearer ${config.LLM_API_KEY}` }),
        },
        body: JSON.stringify(body),
        signal: request.signal,
      })
    } catch {
      throw new ProviderError(true)
    }
    if (!response.ok) {
      throw new ProviderError(response.status === 429 || response.status >= 500)
    }
    const payload: unknown = await response.json()
    if (anthropic) {
      const result = payload as AnthropicResponse
      return {
        text: `{${result.content?.[0]?.text ?? ''}`,
        ...(result.usage ? { usage: result.usage } : {}),
      }
    }
    const result = payload as DeepSeekResponse
    return {
      text: result.choices?.[0]?.message?.content ?? '',
      ...(result.usage ? { usage: result.usage } : {}),
    }
  }
}
