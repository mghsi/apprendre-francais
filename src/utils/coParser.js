const LETTERS = ['A', 'B', 'C', 'D']

const clean = value => String(value || '')
  .replace(/\*\*|__/g, '')
  .replace(/\\([!?.])/g, '$1')
  .replace(/\s{2,}\n/g, '\n')
  .trim()

function sections(markdown) {
  const result = { questions: [], corrections: [] }
  let mode = null
  let current = null
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const top = line.match(/^#\s+(?:\*\*)?(.+?)(?:\*\*)?\s*$/)
    if (top) {
      const name = clean(top[1]).toLowerCase()
      if (name.includes('les questions')) mode = 'questions'
      else if (name.includes('le corrigé') || name.includes('le corrige')) mode = 'corrections'
      current = null
      continue
    }
    const heading = line.match(/^##\s+(?:\*\*)?\s*Question\s+(\d+)\s*(?:\*\*)?\s*$/i)
    if (heading && mode) {
      current = { number: Number(heading[1]), lines: [] }
      result[mode].push(current)
    } else if (current && !/^\[[^\]]+\]:\s*<?data:image\//i.test(line)) current.lines.push(line)
  }
  return result
}

function parseOptions(lines) {
  const options = {}
  const indexes = []
  lines.forEach((line, index) => {
    const match = line.trim().match(/^([A-D])[.):]\s*(.+?)\s{0,2}$/i)
    if (match) {
      options[match[1].toUpperCase()] = match[2]
      indexes.push(index)
    }
  })
  return { options, indexes }
}

function annotations(text, vocabulary) {
  return clean(text).replace(/(?:\*\*)?([^\n()*]+?)(?:\*\*)?\s*\(([^()\n;]+)\s*;\s*([^()\n]+)\)/g,
    (_, word, definition, lemmas) => {
      const item = { word: clean(word).split(/\s+/).slice(-4).join(' '), definition: clean(definition), lemmas: lemmas.split(',').map(clean).filter(Boolean) }
      if (item.word && !vocabulary.some(v => v.word === item.word && v.definition === item.definition)) vocabulary.push(item)
      return clean(word)
    })
}

function parseBlock(block, correction = false) {
  const lines = block.lines
  const { options, indexes } = parseOptions(lines)
  const answerLine = lines.find(line => /réponse(?:\s+correcte)?\s*:/i.test(clean(line))) || ''
  const answer = clean(answerLine).match(/réponse(?:\s+correcte)?\s*:\s*([A-D])/i)?.[1]?.toUpperCase() || null
  const reasonIndex = lines.findIndex(line => /^(?:\*\*)?(raisonnement|explication)\s*:/i.test(line.trim()))
  const end = [reasonIndex, lines.findIndex(line => /réponse(?:\s+correcte)?\s*:/i.test(clean(line)))].filter(i => i >= 0)
  const contentEnd = end.length ? Math.min(...end) : lines.length
  const firstOption = indexes.length ? Math.min(...indexes) : contentEnd
  const beforeLines = lines.slice(0, firstOption)
    .filter(line => line.trim() && !/^!\[/.test(line.trim()))
  let prompt = correction ? '' : beforeLines.join('\n')
  let transcript = ''
  if (correction) {
    const lastLine = beforeLines.at(-1) || ''
    const hasSpokenPrompt = /[?…]\s*$/.test(clean(lastLine))
    prompt = hasSpokenPrompt ? lastLine : ''
    transcript = (hasSpokenPrompt ? beforeLines.slice(0, -1) : beforeLines).join('\n')
  }
  const vocabulary = []
  const parsedOptions = Object.fromEntries(Object.entries(options).map(([k, v]) => [k, annotations(v, vocabulary)]))
  const reasoning = reasonIndex >= 0 ? annotations(lines.slice(reasonIndex).join('\n').replace(/^.*?(?:raisonnement|explication)\s*:\s*/i, ''), vocabulary) : ''
  return {
    options: parsedOptions,
    prompt: annotations(prompt, vocabulary),
    transcript: annotations(transcript, vocabulary),
    answer,
    reasoning,
    vocabulary
  }
}

function firstBlocks(blocks, warnings, label) {
  const map = new Map()
  for (const block of blocks) {
    if (map.has(block.number)) warnings.push(`${label} ${block.number} dupliquée : premier bloc conservé.`)
    else map.set(block.number, block)
  }
  return map
}

export function parseCoMarkdown(markdown) {
  const raw = markdown.replace(/\r\n?/g, '\n')
  const parts = sections(raw)
  const warnings = []
  const blockers = []
  if (!parts.questions.length) blockers.push('Section « Les questions » introuvable.')
  if (!parts.corrections.length) blockers.push('Section « Le corrigé » introuvable.')
  if ((raw.match(/^#\s+(?:\*\*)?Les questions/igm) || []).length > 1 || (raw.match(/^#\s+(?:\*\*)?Le corrig/igm) || []).length > 1) warnings.push('En-têtes de section dupliqués et fusionnés.')
  const publicMap = firstBlocks(parts.questions, warnings, 'Question')
  const correctionMap = firstBlocks(parts.corrections, warnings, 'Correction')
  const imageDefs = new Map()
  raw.replace(/^\[([^\]]+)\]:\s*<?(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)>?\s*$/gim, (_, id, data) => { imageDefs.set(id.toLowerCase(), data); return '' })
  const images = []
  const questions = [...publicMap.keys()].sort((a, b) => a - b).map(number => {
    const pubBlock = publicMap.get(number)
    const corrBlock = correctionMap.get(number)
    const pub = parseBlock(pubBlock)
    const corr = corrBlock ? parseBlock(corrBlock, true) : { options: {}, vocabulary: [] }
    const placeholder = LETTERS.some(letter => /^proposition\s+[a-d]$/i.test(clean(pub.options[letter])))
    const options = placeholder ? corr.options : pub.options
    const imageRef = pubBlock.lines.join('\n').match(/!\[[^\]]*\]\[([^\]]+)\]/)?.[1]?.toLowerCase()
    let image = null
    if (imageRef && imageDefs.has(imageRef)) {
      image = { id: `image-${number}`, dataUrl: imageDefs.get(imageRef) }
      images.push(image)
    } else if (imageRef) warnings.push(`Question ${number} : image ${imageRef} introuvable.`)
    const vocabulary = [...pub.vocabulary, ...(corr.vocabulary || [])]
    return { number, prompt: pub.prompt || corr.prompt || '', options, correctAnswer: corr.answer, transcript: corr.transcript || '', reasoning: corr.reasoning || '', vocabulary, image }
  })
  for (const q of questions) {
    if (!correctionMap.has(q.number)) warnings.push(`Question ${q.number} : correction manquante.`)
    if (!LETTERS.every(l => q.options[l])) warnings.push(`Question ${q.number} : quatre options requises.`)
    if (!q.correctAnswer) warnings.push(`Question ${q.number} : réponse correcte absente.`)
  }
  return { questions, images, questionCount: publicMap.size, correctionCount: correctionMap.size, warnings, blockers }
}

export function audioQuestionNumber(name) {
  const base = name.split('/').pop()
  return Number(base.match(/\((\d+)\)\.mp3$/i)?.[1] || base.match(/(?:question[ -]?|q)(\d+)\.mp3$/i)?.[1] || base.match(/^(\d+)\.mp3$/i)?.[1]) || null
}

export function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  return new Blob([bytes], { type: header.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream' })
}
