// Server-side helper that calls Anthropic's Messages API to obtain
// a structured grammar-correction response for a French sentence.
//
// Authentication
// --------------
// We support two kinds of tokens, picked up from environment variables:
//   1. CLAUDE_CODE_OAUTH_TOKEN  – an OAuth token (starts with "sk-ant-oat...")
//      issued by Anthropic Claude Code. Sent as Authorization: Bearer <token>
//      with the anthropic-beta: oauth-2025-04-20 header. The system prompt
//      MUST start with the Claude Code identity block.
//   2. ANTHROPIC_API_KEY – a regular API key (sent via x-api-key).
//
// The OAuth token is preferred ("first try", per the user request).

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'

const CLAUDE_CODE_IDENTITY =
  "You are Claude Code, Anthropic's official CLI for Claude."

const SYSTEM_INSTRUCTION = `Tu es un professeur de français exigeant et bienveillant.
L'apprenant prépare le TCF et vise le niveau B2+ (proche du C1) à l'épreuve
d'expression écrite. Pour repère, voici les descripteurs CEFR :
  • B2 (cible) : « écrire des textes clairs et détaillés sur différents
    sujets liés à vos intérêts ; transmettre une information et exposer
    votre opinion par écrit ».
  • C1 (ambition) : « écrire des textes structurés, développer votre point
    de vue sur des sujets complexes dans une lettre, un essai, un rapport ;
    s'adapter au style et au destinataire ».

Tu produis DEUX types de retours :

────────────────────────────────────────────────────────────────────────
A) ERRORS — fautes objectives à corriger.
────────────────────────────────────────────────────────────────────────
Identifie TOUTES les erreurs (orthographe, accord, conjugaison, syntaxe,
ponctuation, prépositions, anglicismes, etc.). Pour chaque erreur :
  - "original"   : passage EXACT à corriger (sous-chaîne du texte d'entrée,
                   caractère pour caractère, casse et ponctuation comprises).
  - "corrected"  : version corrigée.
  - "explanation": explication courte (≤ 25 mots), en français, claire.
  - "type"       : "orthographe", "accord", "conjugaison", "syntaxe",
                   "ponctuation", "préposition", "vocabulaire",
                   "anglicisme", "style", "autre".

Règles errors :
  • Ne corrige PAS les variations stylistiques acceptables — uniquement les
    vraies fautes.
  • "original" doit être une sous-chaîne EXACTE retrouvable par indexOf().
  • Pas de chevauchement entre erreurs : regroupe en une seule au besoin.

────────────────────────────────────────────────────────────────────────
B) SUGGESTIONS — recommandations stylistiques pour viser B2+.
────────────────────────────────────────────────────────────────────────
En plus des erreurs, propose, UNIQUEMENT quand c'est pertinent, des
suggestions pour rapprocher l'écrit du niveau B2+/C1. Axes :
  • "vocabulaire"  : remplacer un mot banal/anglicisé par un mot plus
                     précis ou plus idiomatique.
  • "répétition"   : éviter qu'un mot/structure revienne trop souvent.
  • "connecteur"   : enrichir les liens logiques (cependant, en revanche,
                     dans la mesure où, si bien que, à condition que…).
  • "concision"    : alléger une formulation lourde / redondante.
  • "structure"    : varier la syntaxe (subordonnées, inversions, mise
                     en relief, gérondif, participe…) pour gagner en
                     fluidité et structure.
  • "clarté"       : reformuler une phrase ambiguë.
  • "style"        : registre / cohésion / adaptation au destinataire.

Format de chaque suggestion :
  - "original"   : passage EXACT à améliorer (sous-chaîne du texte
                   d'entrée). Tu PEUX laisser "" pour une suggestion
                   globale qui ne vise aucun passage précis.
  - "suggested"  : reformulation proposée (peut être vide si "original"
                   est vide).
  - "explanation": pourquoi c'est une amélioration (≤ 30 mots, français).
  - "category"   : une des catégories ci-dessus.

Règles suggestions (TRÈS IMPORTANT) :
  • Ne suggère RIEN qui ne ferait pas une vraie amélioration. Mieux vaut
    zéro suggestion qu'une suggestion artificielle.
  • Maximum 5 suggestions au total.
  • Une suggestion ne doit JAMAIS chevaucher une erreur ni une autre
    suggestion (sur la même sous-chaîne).
  • Si "original" est non vide, il doit être une sous-chaîne EXACTE.
  • Si le texte est court (< 25 mots) ou déjà excellent, retourne
    "suggestions": [].

  • AUTO-VÉRIFICATION OBLIGATOIRE : pour chaque suggestion, simule
    mentalement le remplacement de "original" par "suggested" dans le
    texte, et VÉRIFIE que le résultat reste 100 % grammatical (élision,
    accord, conjugaison, ponctuation, prépositions).
  • Si la substitution naïve provoquerait une faute (par ex. « de accès »
    au lieu de « d'accès », « le hôpital » au lieu de « l'hôpital »,
    « si il » au lieu de « s'il », « que il » au lieu de « qu'il »),
    ÉLARGIS "original" ET "suggested" pour englober le mot voisin :
        "original": "de marché"   "suggested": "d'accès"
        "original": "le hôtel"    "suggested": "l'hôtel"
    Sinon retire la suggestion.
  • Vérifie particulièrement : élision (de/le/la/que/ne/me/te/se/je/ce
    + voyelle ou h muet → d'/l'/qu'/n'/m'/t'/s'/j'/c'), accord en genre
    et nombre du mot proposé avec son contexte (déterminant, adjectif,
    participe), choix de la préposition (à/de/en/par/pour/avec) qu'exige
    le verbe ou le nom voisin.

────────────────────────────────────────────────────────────────────────
SORTIE
────────────────────────────────────────────────────────────────────────
"fully_corrected" contient le texte corrigé (erreurs appliquées). Tu
n'appliques PAS les suggestions stylistiques dans ce champ.

Réponds UNIQUEMENT en JSON valide, sans Markdown, sans texte autour.

Schéma JSON attendu :
{
  "errors": [
    {
      "original": string,
      "corrected": string,
      "explanation": string,
      "type": string
    }
  ],
  "suggestions": [
    {
      "original": string,
      "suggested": string,
      "explanation": string,
      "category": string
    }
  ],
  "fully_corrected": string
}`

function buildHeaders(token) {
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
  return { headers, isOAuth }
}

function buildSystem(isOAuth) {
  // When using an OAuth token, the system prompt must start with the
  // Claude Code identity sentence. We send the system as an array of
  // text blocks so the identity stays first while still delivering our
  // domain instructions.
  if (isOAuth) {
    return [
      { type: 'text', text: CLAUDE_CODE_IDENTITY },
      { type: 'text', text: SYSTEM_INSTRUCTION },
    ]
  }
  return SYSTEM_INSTRUCTION
}

// Extract the first balanced JSON object from a string. Useful when the
// model wraps the JSON in extra prose despite being asked not to.
function extractJsonObject(text) {
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

function spansOverlap(a, b) {
  return !(a[1] <= b[0] || a[0] >= b[1])
}

function normaliseResult(parsed, originalText) {
  // -------- Errors --------
  const rawErrors = Array.isArray(parsed?.errors) ? parsed.errors : []
  const cleanedErrors = []
  for (const e of rawErrors) {
    if (!e || typeof e !== 'object') continue
    const original = typeof e.original === 'string' ? e.original : ''
    const corrected = typeof e.corrected === 'string' ? e.corrected : ''
    const explanation =
      typeof e.explanation === 'string' ? e.explanation : ''
    const type = typeof e.type === 'string' ? e.type : 'autre'
    if (!original) continue
    if (originalText.indexOf(original) < 0) continue
    cleanedErrors.push({ original, corrected, explanation, type })
  }
  // Deduplicate.
  const seenErr = new Set()
  const dedupedErrors = []
  for (const e of cleanedErrors) {
    const k = `${e.original}→${e.corrected}`
    if (seenErr.has(k)) continue
    seenErr.add(k)
    dedupedErrors.push(e)
  }
  // Resolve overlaps and tag with index.
  const errorSpans = []
  const finalErrors = []
  for (const e of dedupedErrors) {
    const idx = originalText.indexOf(e.original)
    if (idx < 0) continue
    const span = [idx, idx + e.original.length]
    if (errorSpans.some((s) => spansOverlap(s, span))) continue
    errorSpans.push(span)
    finalErrors.push({ ...e, index: idx })
  }
  finalErrors.sort((a, b) => a.index - b.index)

  // -------- Suggestions --------
  const rawSuggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
    : []
  const finalSuggestions = []
  const suggestionSpans = [] // anchored spans only
  for (const s of rawSuggestions) {
    if (!s || typeof s !== 'object') continue
    const original = typeof s.original === 'string' ? s.original : ''
    const suggested = typeof s.suggested === 'string' ? s.suggested : ''
    const explanation =
      typeof s.explanation === 'string' ? s.explanation : ''
    const category = typeof s.category === 'string' ? s.category : 'style'
    // Empty original = global suggestion (no inline highlight)
    if (!original) {
      if (!explanation && !suggested) continue
      finalSuggestions.push({
        original: '',
        suggested,
        explanation,
        category,
        index: -1,
      })
      continue
    }
    const idx = originalText.indexOf(original)
    if (idx < 0) continue
    const span = [idx, idx + original.length]
    // Drop suggestions that overlap with errors or earlier suggestions.
    if (errorSpans.some((s2) => spansOverlap(s2, span))) continue
    if (suggestionSpans.some((s2) => spansOverlap(s2, span))) continue
    suggestionSpans.push(span)
    finalSuggestions.push({
      original,
      suggested,
      explanation,
      category,
      index: idx,
    })
  }
  // Cap to 5 to honour the prompt limit, anchored ones first.
  finalSuggestions.sort((a, b) => {
    if (a.index === -1 && b.index !== -1) return 1
    if (b.index === -1 && a.index !== -1) return -1
    return a.index - b.index
  })
  const cappedSuggestions = finalSuggestions.slice(0, 5)

  const fullyCorrected =
    typeof parsed?.fully_corrected === 'string'
      ? parsed.fully_corrected
      : originalText

  return {
    original: originalText,
    errors: finalErrors.map(({ index, ...rest }) => rest),
    suggestions: cappedSuggestions.map(({ index, ...rest }) => rest),
    fullyCorrected,
  }
}

export async function correctFrenchText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Le texte est vide.')
  }
  const token =
    process.env.CLAUDE_CODE_OAUTH_TOKEN ||
    process.env.ANTHROPIC_API_KEY ||
    ''
  if (!token) {
    throw new Error(
      "Aucun token Claude trouvé. Définis CLAUDE_CODE_OAUTH_TOKEN " +
        '(ou ANTHROPIC_API_KEY) dans ton environnement.'
    )
  }
  const { headers, isOAuth } = buildHeaders(token)
  const body = {
    model: DEFAULT_MODEL,
    max_tokens: 2500,
    temperature: 0,
    system: buildSystem(isOAuth),
    messages: [
      {
        role: 'user',
        content:
          'Voici le texte à corriger. Réponds en JSON strict.\n\n' +
          '<<<TEXTE>>>\n' +
          text +
          '\n<<<FIN>>>',
      },
      // Prefill the assistant turn with "{" so the model is forced to
      // emit a raw JSON object.
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
  // The prefill of "{" is not echoed in the response body, so we add it
  // back to make a valid JSON document.
  const reconstructed = '{' + piece
  let parsed
  try {
    parsed = JSON.parse(reconstructed)
  } catch {
    const extracted = extractJsonObject(reconstructed)
    if (!extracted) {
      throw new Error(
        'Réponse du modèle non parsable comme JSON. Sortie brute : ' +
          reconstructed.slice(0, 400)
      )
    }
    parsed = JSON.parse(extracted)
  }
  return normaliseResult(parsed, text)
}
