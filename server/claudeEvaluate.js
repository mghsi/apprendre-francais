import { chatJson, extractJsonObject } from './llm.js'

const VALID_SKILLS = new Set(['ee', 'eo'])
const VALID_MODES = new Set(['learn', 'guided', 'exam'])

const SYSTEM = `Tu évalues une production d'entraînement au TCF Canada. Tu ne donnes jamais de note officielle ni de niveau garanti.

Évalue d'abord la réussite de la tâche, puis la maîtrise de la langue. Pour l'EO, le texte est une transcription imparfaite : accepte la syntaxe orale naturelle, n'invente aucun diagnostic de prononciation et n'évalue pas l'audio.

Toute observation doit citer un passage exact de la réponse ou nommer précisément une exigence manquante. Limite les priorités à trois.

Réponds uniquement avec ce JSON :
{
  "task_fulfillment": { "status": "strong|partial|weak", "evidence": [string], "missing_requirements": [string] },
  "dimensions": [{ "id": string, "level": "strong|developing|priority|not_assessed", "evidence": [string], "next_action": string }],
  "strengths": [string],
  "priorities": [string],
  "retry_challenge": string,
  "errors": [{ "original": string, "corrected": string, "explanation": string, "type": string }],
  "suggestions": [{ "original": string, "suggested": string, "explanation": string, "category": string }],
  "fully_corrected": string
}`

function strings(value, limit = 6) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()).slice(0, limit) : []
}

function anchoredItems(items, text, fields, limit) {
  if (!Array.isArray(items)) return []
  return items.filter(item => {
    if (!item || typeof item !== 'object') return false
    if (!fields.every(field => typeof item[field] === 'string')) return false
    return item.original && text.includes(item.original)
  }).slice(0, limit)
}

function normalize(parsed, text) {
  const fulfillment = parsed?.task_fulfillment || {}
  const status = ['strong', 'partial', 'weak'].includes(fulfillment.status) ? fulfillment.status : 'partial'
  const dimensions = Array.isArray(parsed?.dimensions) ? parsed.dimensions.filter(item => item && typeof item.id === 'string').slice(0, 6).map(item => ({
    id: item.id,
    level: ['strong', 'developing', 'priority', 'not_assessed'].includes(item.level) ? item.level : 'not_assessed',
    evidence: strings(item.evidence, 3),
    nextAction: typeof item.next_action === 'string' ? item.next_action : ''
  })) : []
  return {
    original: text,
    taskFulfillment: {
      status,
      evidence: strings(fulfillment.evidence, 4),
      missingRequirements: strings(fulfillment.missing_requirements, 4)
    },
    dimensions,
    strengths: strings(parsed?.strengths, 3),
    priorities: strings(parsed?.priorities, 3),
    retryChallenge: typeof parsed?.retry_challenge === 'string' ? parsed.retry_challenge : '',
    disclaimer: 'Évaluation d’entraînement, non officielle',
    errors: anchoredItems(parsed?.errors, text, ['original', 'corrected', 'explanation', 'type'], 30),
    suggestions: anchoredItems(parsed?.suggestions, text, ['original', 'suggested', 'explanation', 'category'], 5),
    fullyCorrected: typeof parsed?.fully_corrected === 'string' ? parsed.fully_corrected : text,
    evaluatorVersion: 'tcf-production-v1'
  }
}

export async function evaluateProduction(input) {
  const skill = typeof input?.skill === 'string' ? input.skill : ''
  const task = Number(input?.task)
  const mode = typeof input?.mode === 'string' ? input.mode : ''
  const text = typeof input?.responseText === 'string' ? input.responseText.trim() : ''
  if (!VALID_SKILLS.has(skill) || ![1, 2, 3].includes(task)) throw new Error('Combinaison épreuve/tâche invalide.')
  if (!VALID_MODES.has(mode)) throw new Error('Mode d’entraînement invalide.')
  if (!text) throw new Error('La réponse est vide.')
  if (text.length > 20000) throw new Error('La réponse dépasse la limite de 20 000 caractères.')

  const context = {
    skill,
    task,
    mode,
    promptId: input.promptId || 'custom',
    promptVersion: input.promptVersion || 1,
    instruction: String(input.instruction || '').slice(0, 6000),
    expectedCoverage: Array.isArray(input.expectedCoverage) ? input.expectedCoverage : [],
    assistanceUsed: Array.isArray(input.assistanceUsed) ? input.assistanceUsed : []
  }
  const { text: raw } = await chatJson({
    system: SYSTEM,
    userContent: `CONTEXTE\n${JSON.stringify(context)}\n\nRÉPONSE\n<<<${text}>>>`,
    maxTokens: 12000,
    temperature: 0
  })
  let parsed
  try { parsed = JSON.parse(raw) } catch {
    const extracted = extractJsonObject(raw)
    if (!extracted) throw new Error('Réponse d’évaluation non parsable.')
    parsed = JSON.parse(extracted)
  }
  return normalize(parsed, text)
}
