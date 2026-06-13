// Server-side helper that obtains a structured grammar-correction response
// for a French sentence. The actual LLM call (DeepSeek or Anthropic) is
// delegated to server/llm.js, which picks the provider from env vars.

import { chatJson, extractJsonObject } from './llm.js'

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
  // Long essays (e.g. TCF Tâche 3 ≥ 180 mots) can produce many
  // error+suggestion entries. A small cap truncates the JSON mid-array
  // and makes JSON.parse fail, so we ask for a generous token budget.
  const { text: reconstructed, stopReason } = await chatJson({
    system: SYSTEM_INSTRUCTION,
    userContent:
      'Voici le texte à corriger. Réponds en JSON strict.\n\n' +
      '<<<TEXTE>>>\n' +
      text +
      '\n<<<FIN>>>',
    maxTokens: 16000,
    temperature: 0,
  })
  let parsed
  try {
    parsed = JSON.parse(reconstructed)
  } catch {
    const extracted = extractJsonObject(reconstructed)
    if (!extracted) {
      if (stopReason === 'max_tokens') {
        throw new Error(
          "La réponse du modèle a été tronquée (limite max_tokens atteinte). " +
            'Essaie un texte plus court ou augmente max_tokens dans ' +
            'server/claudeCorrect.js.'
        )
      }
      throw new Error(
        'Réponse du modèle non parsable comme JSON. Sortie brute : ' +
          reconstructed.slice(0, 400)
      )
    }
    parsed = JSON.parse(extracted)
  }
  return normaliseResult(parsed, text)
}
