<template>
  <aside
    class="vocab-panel"
    :class="{ collapsed: !expanded, sidebar }"
    :aria-expanded="expanded"
  >
    <header class="vp-header">
      <button
        class="vp-toggle"
        :title="expanded ? 'Réduire le panneau' : 'Déplier le panneau'"
        @click="expanded = !expanded"
      >
        <span class="vp-toggle-icon">{{ expanded ? '▾' : '▸' }}</span>
        <span class="vp-toggle-label">
          📚 Vocabulaire thématique B2+
        </span>
      </button>
      <span v-if="totalEntries > 0" class="vp-count">{{ totalEntries }} entrées</span>
    </header>

    <div v-show="expanded" class="vp-body">
      <!-- Mode tabs : AI vs BYO -->
      <div class="vp-mode-tabs" role="tablist">
        <button
          class="vp-mode-tab"
          :class="{ active: mode === 'ai' }"
          @click="mode = 'ai'"
        >🤖 Généré par IA</button>
        <button
          class="vp-mode-tab"
          :class="{ active: mode === 'byo' }"
          @click="mode = 'byo'"
        >📝 Mon vocabulaire</button>
      </div>

      <!-- ============================= MODE IA ============================= -->
      <section v-if="mode === 'ai'" class="vp-ai">
        <div class="vp-theme-row">
          <input
            class="vp-theme-input"
            type="text"
            v-model="themeInput"
            placeholder="Thème à explorer (ex. la transition écologique, le télétravail…)"
            @keydown.enter="generate"
            :disabled="loading"
          />
          <button
            class="vp-generate"
            :disabled="loading || !themeInput.trim()"
            @click="generate"
          >
            {{ loading ? '⏳ Génération…' : '✨ Générer' }}
          </button>
        </div>

        <p v-if="cachedThemes.length > 0" class="vp-history">
          <span class="vp-history-label">Récents :</span>
          <button
            v-for="t in cachedThemes"
            :key="t"
            class="vp-history-chip"
            @click="loadCached(t)"
            :title="`Recharger « ${t} »`"
          >{{ t }}</button>
        </p>

        <div v-if="error" class="vp-error">⚠️ {{ error }}</div>

        <div v-if="data && !loading" class="vp-data">
          <p class="vp-theme-label">
            Thème : <strong>{{ data.theme }}</strong>
            <span class="vp-level">B2+</span>
          </p>

          <details v-if="data.nouns?.length" open class="vp-group">
            <summary>🏷 Noms <span class="vp-group-count">{{ data.nouns.length }}</span></summary>
            <ul class="vp-list">
              <li v-for="(n, i) in data.nouns" :key="i">
                <span class="vp-term">{{ n.term }}</span>
                <span v-if="n.definition" class="vp-def"> — {{ n.definition }}</span>
                <em v-if="n.example" class="vp-ex">« {{ n.example }} »</em>
              </li>
            </ul>
          </details>

          <details v-if="data.verbs?.length" open class="vp-group">
            <summary>🛠 Verbes <span class="vp-group-count">{{ data.verbs.length }}</span></summary>
            <ul class="vp-list">
              <li v-for="(v, i) in data.verbs" :key="i">
                <span class="vp-term">{{ v.term }}</span>
                <span v-if="v.construction" class="vp-construct"> ({{ v.construction }})</span>
                <em v-if="v.example" class="vp-ex">« {{ v.example }} »</em>
              </li>
            </ul>
          </details>

          <details v-if="data.adjectives?.length" class="vp-group">
            <summary>🎨 Adjectifs <span class="vp-group-count">{{ data.adjectives.length }}</span></summary>
            <ul class="vp-list">
              <li v-for="(a, i) in data.adjectives" :key="i">
                <span class="vp-term">{{ a.term }}</span>
                <em v-if="a.example" class="vp-ex">« {{ a.example }} »</em>
              </li>
            </ul>
          </details>

          <details v-if="data.connectors?.length" open class="vp-group">
            <summary>🔗 Connecteurs <span class="vp-group-count">{{ data.connectors.length }}</span></summary>
            <ul class="vp-list">
              <li v-for="(c, i) in data.connectors" :key="i">
                <span class="vp-term">{{ c.term }}</span>
                <span v-if="c.use" class="vp-def"> — {{ c.use }}</span>
                <em v-if="c.example" class="vp-ex">« {{ c.example }} »</em>
              </li>
            </ul>
          </details>

          <details v-if="data.expressions?.length" class="vp-group">
            <summary>💬 Expressions <span class="vp-group-count">{{ data.expressions.length }}</span></summary>
            <ul class="vp-list">
              <li v-for="(e, i) in data.expressions" :key="i">
                <span class="vp-term">{{ e.term }}</span>
                <span v-if="e.register" class="vp-register">{{ e.register }}</span>
                <em v-if="e.example" class="vp-ex">« {{ e.example }} »</em>
              </li>
            </ul>
          </details>

          <details v-if="data.pitfalls?.length" class="vp-group warn">
            <summary>⚠️ Pièges fréquents <span class="vp-group-count">{{ data.pitfalls.length }}</span></summary>
            <ul class="vp-list">
              <li v-for="(p, i) in data.pitfalls" :key="i">
                <span class="vp-wrong">✗ {{ p.wrong }}</span>
                <span class="vp-right">✓ {{ p.right }}</span>
                <em v-if="p.note" class="vp-ex">{{ p.note }}</em>
              </li>
            </ul>
          </details>
        </div>

        <p v-else-if="!data && !loading && !error" class="vp-hint">
          Tape un thème puis « Générer » pour obtenir un dossier lexical B2+
          (noms, verbes, adjectifs, connecteurs, expressions, pièges).
        </p>
      </section>

      <!-- ============================= MODE BYO ============================ -->
      <section v-else class="vp-byo">
        <label class="vp-byo-label" for="byo-area">
          Colle ton propre vocabulaire (libre, une entrée par ligne).
        </label>
        <textarea
          id="byo-area"
          class="vp-byo-area"
          v-model="byoText"
          placeholder="contribuer à — verbe utile&#10;la sobriété énergétique — concept clé&#10;en revanche — connecteur d'opposition"
          spellcheck="false"
          rows="10"
        ></textarea>
        <p class="vp-hint">
          Ce texte est conservé localement et reste visible pendant la
          préparation et la prise de parole.
        </p>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { runAiOperation } from '../services/api.js'

const props = defineProps({
  taskId: { type: [String, Number], default: 3 },
  sidebar: { type: Boolean, default: false },
  autoCollapse: { type: Boolean, default: false }, // true → recording → collapse
  recording: { type: Boolean, default: false },
})

const STORAGE_KEY = `tcf-eo-vocab-v1-task${props.taskId}`
const CACHE_KEY = `tcf-eo-vocab-cache-v1`

const expanded = ref(true)
const mode = ref('ai') // 'ai' | 'byo'

const themeInput = ref('')
const data = ref(null)
const loading = ref(false)
const error = ref('')

const byoText = ref('')

// Load persisted state
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const obj = JSON.parse(raw)
    themeInput.value = obj.theme || ''
    data.value = obj.data || null
    byoText.value = obj.byo || ''
    mode.value = obj.mode === 'byo' ? 'byo' : 'ai'
  }
} catch { /* ignore */ }

// Persist on change
watch(
  [themeInput, data, byoText, mode],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme: themeInput.value,
          data: data.value,
          byo: byoText.value,
          mode: mode.value,
        })
      )
    } catch { /* quota */ }
  },
  { deep: true }
)

// Cache of recently generated themes (for quick reload)
const cachedThemes = ref(loadCache())
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    return Object.keys(JSON.parse(raw)).slice(-6).reverse()
  } catch { return [] }
}
function readCacheMap() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch { return {} }
}
function writeCacheMap(map) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)) } catch { /* */ }
}

function loadCached(theme) {
  const map = readCacheMap()
  const entry = map[theme]
  if (entry) {
    themeInput.value = theme
    data.value = entry
  }
}

async function generate() {
  const theme = themeInput.value.trim()
  if (!theme || loading.value) return
  // Hit cache first
  const map = readCacheMap()
  if (map[theme]) {
    data.value = map[theme]
    cachedThemes.value = Object.keys(map).slice(-6).reverse()
    return
  }
  loading.value = true
  error.value = ''
  try {
    const json = await runAiOperation('vocabulary', { theme })
    data.value = json
    map[theme] = json
    writeCacheMap(map)
    cachedThemes.value = Object.keys(map).slice(-6).reverse()
  } catch (e) {
    error.value = e?.message || 'Erreur inattendue'
  } finally {
    loading.value = false
  }
}

const totalEntries = computed(() => {
  if (mode.value === 'byo') {
    return (byoText.value || '').split('\n').filter((l) => l.trim()).length
  }
  if (!data.value) return 0
  return (data.value.nouns?.length || 0) +
    (data.value.verbs?.length || 0) +
    (data.value.adjectives?.length || 0) +
    (data.value.connectors?.length || 0) +
    (data.value.expressions?.length || 0) +
    (data.value.pitfalls?.length || 0)
})

// Auto-collapse when recording starts (if asked)
watch(() => props.recording, (rec) => {
  if (rec && props.autoCollapse) expanded.value = false
})
</script>

<style scoped>
.vocab-panel {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.2s;
}
.vocab-panel.sidebar {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}

.vp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface-alt);
  border-bottom: 1px solid var(--border);
}
.vocab-panel.collapsed .vp-header { border-bottom: none; }

.vp-toggle {
  background: transparent;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
}
.vp-toggle-icon {
  font-size: 12px;
  color: #e67e22;
}
.vp-count {
  font-size: 11px;
  color: var(--text-faint);
  background: var(--surface);
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.vp-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vp-mode-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--surface-alt);
  border-radius: 10px;
  width: fit-content;
}
.vp-mode-tab {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.vp-mode-tab.active {
  background: var(--surface);
  color: #e67e22;
  box-shadow: 0 1px 3px var(--shadow-sm);
}

/* AI mode */
.vp-theme-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.vp-theme-input {
  flex: 1;
  min-width: 180px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.vp-theme-input:focus { border-color: #e67e22; }
.vp-generate {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1.5px solid #e67e22;
  background: #e67e2214;
  color: #e67e22;
  font-family: inherit;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.vp-generate:hover:not(:disabled) {
  background: #e67e22;
  color: white;
}
.vp-generate:disabled { opacity: 0.5; cursor: not-allowed; }

.vp-history {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  color: var(--text-faint);
  margin: 0;
}
.vp-history-label { margin-right: 4px; }
.vp-history-chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.vp-history-chip:hover { border-color: #e67e22; color: #e67e22; }

.vp-error {
  padding: 8px 10px;
  border-radius: 8px;
  background: #c0392b14;
  border: 1px solid #c0392b66;
  color: #c0392b;
  font-size: 12.5px;
}

.vp-theme-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.vp-level {
  font-size: 10.5px;
  font-weight: 700;
  background: #e67e2214;
  color: #e67e22;
  padding: 2px 6px;
  border-radius: 6px;
  margin-left: 6px;
}

.vp-data { display: flex; flex-direction: column; gap: 6px; }
.vp-group {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px 10px;
  background: var(--surface-alt);
}
.vp-group.warn { background: #c0392b08; border-color: #c0392b40; }
.vp-group > summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 0;
  list-style: none;
}
.vp-group > summary::-webkit-details-marker { display: none; }
.vp-group > summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 6px;
  color: #e67e22;
  transition: transform 0.15s;
}
.vp-group[open] > summary::before { transform: rotate(90deg); }
.vp-group-count {
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 500;
  margin-left: 4px;
}

.vp-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vp-list li {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  padding: 6px 8px;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.vp-term {
  font-weight: 600;
  color: var(--text-primary);
}
.vp-def, .vp-construct {
  color: var(--text-muted);
  font-size: 12.5px;
}
.vp-construct { font-style: italic; }
.vp-ex {
  display: block;
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 2px;
  font-style: italic;
}
.vp-register {
  font-size: 10.5px;
  background: var(--surface-alt);
  color: var(--text-faint);
  padding: 1px 6px;
  border-radius: 6px;
  margin-left: 4px;
}
.vp-wrong {
  display: block;
  color: #c0392b;
  font-size: 12.5px;
  font-weight: 600;
}
.vp-right {
  display: block;
  color: #27ae60;
  font-size: 12.5px;
  font-weight: 600;
}

.vp-hint {
  font-size: 12px;
  color: var(--text-faint);
  font-style: italic;
  line-height: 1.5;
  margin: 0;
}

/* BYO mode */
.vp-byo-label {
  font-size: 12.5px;
  color: var(--text-muted);
  font-weight: 600;
}
.vp-byo-area {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.vp-byo-area:focus { border-color: #e67e22; }
</style>
