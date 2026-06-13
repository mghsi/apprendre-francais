// Server-side helper that generates a B2+ thematic vocabulary pack for the
// TCF Expression Orale (Tâche 3 — expression d'une opinion). The LLM call
// (DeepSeek or Anthropic) is delegated to server/llm.js.

import { chatJson, extractJsonObject } from './llm.js'

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
  const { text: reconstructed } = await chatJson({
    system: SYSTEM_INSTRUCTION,
    userContent:
      'Génère un dossier lexical B2+ pour le TCF (Tâche 3, expression ' +
      "d'une opinion) sur le thème suivant. Réponds en JSON strict.\n\n" +
      '<<<THÈME>>>\n' +
      theme.trim() +
      '\n<<<FIN>>>',
    maxTokens: 8000,
    temperature: 0.3,
  })
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
