// Server-side helper that asks Claude to generate a B2+ thematic vocabulary
// pack for the TCF Expression Orale (Tâche 3 — expression d'une opinion).
//
// Uses the same auth strategy as server/claudeCorrect.js (OAuth token first,
// API key fallback). The model is asked to return strict JSON.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'

const CLAUDE_CODE_IDENTITY =
  "You are Claude Code, Anthropic's official CLI for Claude."

const SYSTEM_INSTRUCTION = `Tu es un professeur de français spécialisé dans la
préparation au TCF (épreuve d'Expression Orale, Tâche 3 — expression d'une
opinion). L'apprenant vise un niveau B2+/C1.

Tu reçois un THÈME (sujet de société) et tu produis un dossier lexical riche,
précis et IMMÉDIATEMENT utilisable à l'oral pour argumenter pendant 5 minutes.

Cible : 8 à 10 entrées par catégorie (noms, verbes, adjectifs, connecteurs,
expressions), et 5 pièges fréquents.

Critères de qualité :
  • Niveau B2+/C1 : évite les mots banals (« bon », « chose », « faire »)
    sauf s'ils s'inscrivent dans une collocation idiomatique précise.
  • Pertinence : tout mot doit pouvoir servir à formuler un argument lié au
    thème (pas de remplissage générique).
  • Précision : pour chaque entrée, donne un exemple court (≤ 18 mots) qui
    montre l'usage NATUREL et CORRECT du terme dans une phrase liée au thème.
  • Pas de redondance.
  • Variété de registre : majoritairement courant, quelques entrées soutenues
    si pertinentes.

Réponds UNIQUEMENT en JSON valide, sans Markdown, sans texte autour.

Schéma JSON attendu :
{
  "theme": string,
  "level": "B2+",
  "nouns":      [{ "term": string, "definition": string, "example": string }],
  "verbs":      [{ "term": string, "construction": string, "example": string }],
  "adjectives": [{ "term": string, "example": string }],
  "connectors": [{ "term": string, "use": string, "example": string }],
  "expressions":[{ "term": string, "register": "courant"|"soutenu"|"familier", "example": string }],
  "pitfalls":   [{ "wrong": string, "right": string, "note": string }]
}

Notes :
  • "construction" pour les verbes = schéma syntaxique attendu, p. ex.
    « contribuer à qch », « inciter qn à faire », « pâtir de qch ».
  • "use" pour les connecteurs = à quoi sert le connecteur, p. ex.
    « introduire une concession », « exprimer une conséquence ».
  • "pitfalls" liste 5 erreurs fréquentes d'apprenants sur ce thème
    (faux-amis, anglicismes, mauvaises prépositions, accords typiques).`

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
  if (isOAuth) {
    return [
      { type: 'text', text: CLAUDE_CODE_IDENTITY },
      { type: 'text', text: SYSTEM_INSTRUCTION },
    ]
  }
  return SYSTEM_INSTRUCTION
}

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

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function normaliseResult(parsed, theme) {
  const safe = (s) => (typeof s === 'string' ? s.trim() : '')
  return {
    theme: safe(parsed?.theme) || theme,
    level: 'B2+',
    nouns: asArray(parsed?.nouns).map((n) => ({
      term: safe(n?.term),
      definition: safe(n?.definition),
      example: safe(n?.example),
    })).filter((n) => n.term),
    verbs: asArray(parsed?.verbs).map((v) => ({
      term: safe(v?.term),
      construction: safe(v?.construction),
      example: safe(v?.example),
    })).filter((v) => v.term),
    adjectives: asArray(parsed?.adjectives).map((a) => ({
      term: safe(a?.term),
      example: safe(a?.example),
    })).filter((a) => a.term),
    connectors: asArray(parsed?.connectors).map((c) => ({
      term: safe(c?.term),
      use: safe(c?.use),
      example: safe(c?.example),
    })).filter((c) => c.term),
    expressions: asArray(parsed?.expressions).map((e) => ({
      term: safe(e?.term),
      register: safe(e?.register) || 'courant',
      example: safe(e?.example),
    })).filter((e) => e.term),
    pitfalls: asArray(parsed?.pitfalls).map((p) => ({
      wrong: safe(p?.wrong),
      right: safe(p?.right),
      note: safe(p?.note),
    })).filter((p) => p.wrong && p.right),
  }
}

export async function generateVocab(theme) {
  if (typeof theme !== 'string' || !theme.trim()) {
    throw new Error('Le thème est vide.')
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
    max_tokens: 8000,
    temperature: 0.3,
    system: buildSystem(isOAuth),
    messages: [
      {
        role: 'user',
        content:
          'Génère un dossier lexical B2+ pour le TCF (Tâche 3, expression ' +
          'd\'une opinion) sur le thème suivant. Réponds en JSON strict.\n\n' +
          '<<<THÈME>>>\n' +
          theme.trim() +
          '\n<<<FIN>>>',
      },
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
  return normaliseResult(parsed, theme)
}
