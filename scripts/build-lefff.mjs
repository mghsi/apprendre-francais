import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'generated')
const chunksDir = join(outDir, 'lefff-chunks')

mkdirSync(chunksDir, { recursive: true })

// Curated verbs to exclude from Lefff output
const curatedVerbs = new Set([
  'être', 'avoir', 'aller', 'faire', 'vouloir', 'pouvoir', 'devoir',
  'savoir', 'dire', 'voir', 'venir', 'prendre', 'mettre', 'parler',
  'manger', 'donner', 'penser', 'aimer', 'finir', 'choisir', 'partir',
  'écrire', 'lire', 'connaître', 'croire', 'vivre', 'attendre',
  'répondre', 'dormir', 'sortir',
])

// Load Lefff data
const rawPath = join(root, 'node_modules', 'french-verbs-lefff', 'dist', 'conjugations.json')
const raw = JSON.parse(readFileSync(rawPath, 'utf-8'))

// Tense mapping: Lefff key -> app key
const tenseMap = {
  P: 'présent',
  I: 'imparfait',
  F: 'futur',
  C: 'conditionnel',
  S: 'subjonctif',
  Y: 'impératif',
}

const allerPresent = ['vais', 'vas', 'va', 'allons', 'allez', 'vont']

function inferGroupe(infinitif, data) {
  if (infinitif.endsWith('er') && infinitif !== 'aller') return '1er groupe (-er)'
  if (infinitif.endsWith('ir') && data.P && data.P[3] && data.P[3].endsWith('issons')) return '2e groupe (-ir)'
  return '3e groupe'
}

function normalizeForm(val) {
  if (val === null || val === undefined || val === 'NA') return null
  return val
}

function transformVerb(infinitif, data) {
  const result = {}
  const availableTenses = []
  let defective = false

  for (const [lKey, appKey] of Object.entries(tenseMap)) {
    const forms = data[lKey]
    if (!forms || forms.length < 6) continue

    const mapped = forms.slice(0, 6).map(normalizeForm)

    // For impératif, set je/il/ils to null
    if (appKey === 'impératif') {
      mapped[0] = null
      mapped[2] = null
      mapped[5] = null
    }

    // Check for defective verbs (some persons are null)
    if (mapped.some(v => v === null && appKey !== 'impératif')) {
      defective = true
    }
    // For impératif, check if all real positions are null
    if (appKey === 'impératif' && mapped[1] === null && mapped[3] === null && mapped[4] === null) {
      continue
    }

    result[appKey] = mapped
    availableTenses.push(appKey)
  }

  // Generate futur_proche: aller present + infinitif
  if (result['présent']) {
    const fp = allerPresent.map((a, i) => {
      // If the verb's present for this person is null (defective), futur proche is also null
      if (result['présent'][i] === null) return null
      return `${a} ${infinitif}`
    })
    result['futur_proche'] = fp
    availableTenses.push('futur_proche')
  }

  return { conjugations: result, availableTenses, defective }
}

// Process all verbs
const index = []
const chunks = {}

let processed = 0
let skipped = 0

for (const [verb, data] of Object.entries(raw)) {
  // Skip meta entries and curated verbs
  if (verb.startsWith('uw') || curatedVerbs.has(verb)) {
    skipped++
    continue
  }

  // Skip verbs without present tense
  if (!data.P || data.P.length < 6) {
    skipped++
    continue
  }

  const groupe = inferGroupe(verb, data)
  const { conjugations, availableTenses, defective } = transformVerb(verb, data)

  if (availableTenses.length === 0) {
    skipped++
    continue
  }

  // Determine chunk letter (handle accented first letters)
  const firstChar = verb.normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0].toLowerCase()
  const chunk = /[a-z]/.test(firstChar) ? firstChar : '_'

  if (!chunks[chunk]) chunks[chunk] = {}
  chunks[chunk][verb] = { groupe, ...conjugations }

  index.push({
    verb,
    chunk,
    groupe,
    defective,
    tenses: availableTenses,
  })

  processed++
}

// Sort index alphabetically
index.sort((a, b) => a.verb.localeCompare(b.verb, 'fr'))

// Write compact index (just verb + chunk letter for search)
const compactIndex = index.map(e => [e.verb, e.chunk])
writeFileSync(join(outDir, 'lefff-index.json'), JSON.stringify(compactIndex))

// Write chunks (include groupe + tenses metadata per verb)
for (const [letter, data] of Object.entries(chunks)) {
  writeFileSync(join(chunksDir, `${letter}.json`), JSON.stringify(data))
}

console.log(`✅ Built Lefff data:`)
console.log(`   ${processed} verbs processed`)
console.log(`   ${skipped} skipped (curated/meta/incomplete)`)
console.log(`   ${Object.keys(chunks).length} chunks written`)
console.log(`   Index: ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`)
