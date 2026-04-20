import { ref, shallowRef } from 'vue'

const index = shallowRef(null)
const loadedChunks = {}
const indexLoading = ref(false)
const indexLoaded = ref(false)

export function useExtendedVerbs() {
  async function loadIndex() {
    if (indexLoaded.value || indexLoading.value) return
    indexLoading.value = true
    try {
      const res = await fetch('/generated/lefff-index.json')
      index.value = await res.json()
      indexLoaded.value = true
    } finally {
      indexLoading.value = false
    }
  }

  async function loadChunk(letter) {
    if (loadedChunks[letter]) return loadedChunks[letter]
    const res = await fetch(`/generated/lefff-chunks/${letter}.json`)
    const data = await res.json()
    loadedChunks[letter] = data
    return data
  }

  async function getVerb(verb, chunkLetter) {
    const chunk = await loadChunk(chunkLetter)
    return chunk[verb] || null
  }

  function searchVerbs(query, limit = 30) {
    if (!index.value || !query) return []
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const exact = []
    const starts = []
    const contains = []
    for (const [verb, chunk] of index.value) {
      const normalized = verb.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (normalized === q) {
        exact.push({ verb, chunk })
      } else if (normalized.startsWith(q)) {
        starts.push({ verb, chunk })
      } else if (normalized.includes(q)) {
        contains.push({ verb, chunk })
      }
      if (exact.length + starts.length + contains.length >= limit) break
    }
    return [...exact, ...starts, ...contains].slice(0, limit)
  }

  return {
    index,
    indexLoaded,
    indexLoading,
    loadIndex,
    getVerb,
    searchVerbs,
  }
}
