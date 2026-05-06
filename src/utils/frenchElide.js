// Small post-processing safety-net for French elision/contraction
// rules. Applied AFTER each substitution to catch cases where the
// model emits a substring that, once inserted, breaks elision (e.g.
// "de accès" instead of "d'accès").
//
// We err on the side of caution: where elision depends on whether the
// next word starts with an "h aspiré" (which refuses elision —
// e.g. « le héros », « la haine »), we use a small allow-list of the
// most common h-aspiré words. If the next h-initial word is in the
// list we leave the text alone; otherwise we elide.

// Vowels (with common accents).
const VOWELS = 'aàâeéèêëiîïoôuûüœyAÀÂEÉÈÊËIÎÏOÔUÛÜŒY'

// h-aspiré allow-list — words that REFUSE elision/contraction. Limited
// to the most common ones; if you stumble on a missing one the rule
// will incorrectly elide. Add it here.
const H_ASPIRE = new Set([
  'haine', 'haineux', 'haineuse', 'haineuses', 'haineusement',
  'haïr', 'hais', 'haïssait', 'haïssaient', 'haïssant',
  'hall', 'halls', 'halle', 'halles', 'hamac', 'hamacs',
  'hamburger', 'hamburgers', 'hameau', 'hameaux',
  'hampe', 'hampes', 'hamster', 'hamsters',
  'hanche', 'hanches', 'hand', 'handicap', 'handicaps',
  'handicapé', 'handicapée', 'handicapés', 'handicapées',
  'hangar', 'hangars',
  'hanter', 'hanté', 'hantée', 'hantés', 'hantées',
  'haras', 'harasser', 'harassé', 'harassée',
  'harceler', 'harcèle', 'harcelé', 'harcelée', 'harcèlement',
  'hard', 'hardi', 'hardie', 'hardis', 'hardies', 'hardiment',
  'harem', 'harems', 'hareng', 'harengs',
  'hargne', 'hargneux', 'hargneuse',
  'haricot', 'haricots',
  'harnacher', 'harnaché', 'harnais',
  'harpe', 'harpes', 'harpon', 'harpons',
  'hasard', 'hasards', 'hasarder', 'hasardeux', 'hasardeuse',
  'hâte', 'hâter', 'hâtif', 'hâtive', 'hâtivement',
  'hausse', 'hausses', 'hausser', 'haussé',
  'haut', 'haute', 'hauts', 'hautes', 'hauteur', 'hauteurs', 'hautement',
  'havre', 'havres', 'hayon', 'hayons',
  'hennir', 'hennit', 'hérisser', 'hérissé', 'hérisson',
  'héron', 'hérons', 'héros', 'hêtre', 'hêtres',
  'heurter', 'heurté', 'heurtée', 'heurts', 'heurt',
  'hibou', 'hiboux', 'hideux', 'hideuse', 'hideusement',
  'hiérarchie', 'hiérarchies', 'hiérarchique', 'hiérarchiques',
  'hisser', 'hissé', 'hissée',
  'hochet', 'hochets', 'hockey',
  'holding', 'homard', 'homards',
  'hongrois', 'hongroise',
  'honni', 'honnie', 'honte', 'honteux', 'honteuse',
  'hoquet', 'hoquets', 'horde', 'hordes', 'hors',
  'hot', 'hotte', 'hottes', 'houblon',
  'houille', 'houilles', 'houle', 'houles', 'houleux', 'houleuse',
  'housse', 'housses',
  'huit', 'huitième', 'huitièmes', 'hublot', 'hublots',
  'huche', 'huches', 'huer', 'hué', 'huée', 'huées',
  'huppe', 'huppes', 'huppé', 'huppée',
  'hurler', 'hurlé', 'hurlée', 'hurlement', 'hurlements',
  'hutte', 'huttes', 'hyène', 'hyènes',
])

function isHAspire(word) {
  // Strip trailing punctuation for lookup; lowercase.
  const w = word.toLowerCase().replace(/[^\p{L}'-]+$/u, '')
  return H_ASPIRE.has(w)
}

function startsWithVowel(word) {
  return VOWELS.includes(word[0] ?? '')
}
function startsWithH(word) {
  return word[0] === 'h' || word[0] === 'H'
}

function preserveCase(originalParticle, replacementLower) {
  // Returns the replacement matching the casing of the original
  // particle's first letter. e.g. "Que" + "qu'" → "Qu'".
  const first = originalParticle[0]
  if (first && first.toUpperCase() === first && first.toLowerCase() !== first) {
    return replacementLower[0].toUpperCase() + replacementLower.slice(1)
  }
  return replacementLower
}

// Replace `<particle> <word>` with `<elided><word>` when <word>
// starts with a vowel, or with an h-muet (i.e. h-initial AND not in
// the H_ASPIRE list).
function elideBeforeWord(text, particleRegex, replacement) {
  const re = new RegExp(
    `\\b(${particleRegex})\\s+([\\p{L}][\\p{L}'-]*)`,
    'giu'
  )
  return text.replace(re, (match, particle, nextWord) => {
    if (startsWithVowel(nextWord)) {
      return preserveCase(particle, replacement) + nextWord
    }
    if (startsWithH(nextWord) && !isHAspire(nextWord)) {
      return preserveCase(particle, replacement) + nextWord
    }
    return match
  })
}

const RULES = [
  // Particles ending in -e
  (t) => elideBeforeWord(t, 'de', "d'"),
  (t) => elideBeforeWord(t, 'ne', "n'"),
  (t) => elideBeforeWord(t, 'me', "m'"),
  (t) => elideBeforeWord(t, 'te', "t'"),
  (t) => elideBeforeWord(t, 'se', "s'"),
  (t) => elideBeforeWord(t, 'je', "j'"),
  (t) => elideBeforeWord(t, 'que', "qu'"),
  (t) => elideBeforeWord(t, 'lorsque', "lorsqu'"),
  (t) => elideBeforeWord(t, 'puisque', "puisqu'"),
  (t) => elideBeforeWord(t, 'quoique', "quoiqu'"),
  (t) => elideBeforeWord(t, 'jusque', "jusqu'"),
  // Articles le / la
  (t) => elideBeforeWord(t, 'le', "l'"),
  (t) => elideBeforeWord(t, 'la', "l'"),
  // ce + (forms of être / avoir) → c'est, c'était…
  (t) =>
    t.replace(
      /\b(c)e\s+(est|était|étaient|aurait|aura|eût|avait|a été)\b/gi,
      (_m, c, v) => preserveCase(c + 'e', "c'") + v
    ),
  // si il / si ils → s'il / s'ils
  (t) =>
    t.replace(/\bsi\s+(ils?)\b/gi, (m, ils) => {
      return preserveCase(m, "s'") + ils
    }),
]

export function applyFrenchElision(text) {
  let out = text
  for (const rule of RULES) out = rule(out)
  return out
}
