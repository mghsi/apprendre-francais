<template>
  <div>
    <div class="search-row">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Chercher un verbe..."
          :value="search"
          @input="$emit('update:search', $event.target.value)"
          class="search-input"
        />
      </div>
      <button class="quiz-btn" :class="{ active: quizMode }" @click="toggleQuiz">
        {{ quizMode ? '✕ Quitter' : '🎯 Quiz' }}
      </button>
    </div>

    <div class="verb-chips">
      <button
        v-for="v in filteredVerbs"
        :key="v"
        class="verb-chip"
        :class="{ selected: selectedVerb === v }"
        @click="selectVerb(v)"
      >
        {{ v }}
      </button>
      <span v-if="filteredVerbs.length === 0" class="no-results">Aucun verbe trouvé</span>
    </div>

    <div class="verb-hero">
      <h2 class="verb-name">{{ selectedVerb }}</h2>
      <span class="verb-groupe">{{ data.groupe }}</span>
    </div>

    <div class="temps-chips">
      <button
        v-for="t in tempsList"
        :key="t"
        class="temps-chip"
        :class="{ selected: selectedTemps === t }"
        @click="selectTemps(t)"
      >
        {{ tempsLabels[t] }}
      </button>
    </div>

    <h3 class="table-heading">
      {{ tempsLabels[selectedTemps] }} de <em>{{ selectedVerb }}</em>
    </h3>

    <div class="table-wrapper">
      <table class="conj-table">
        <thead>
          <tr>
            <th>Sujet</th>
            <th>Conjugaison</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(s, i) in sujets"
            :key="i"
            :class="rowClass(i)"
          >
            <td class="sujet-cell">{{ s }}</td>
            <td class="conj-cell">
              <template v-if="quizMode && conjugations[i] !== '—'">
                <div class="quiz-input-row">
                  <input
                    type="text"
                    :value="quizAnswers[i] || ''"
                    @input="updateAnswer(i, $event.target.value)"
                    :disabled="showResults"
                    class="quiz-input"
                    :class="inputClass(i)"
                    placeholder="?"
                  />
                  <span
                    v-if="showResults && !isCorrect(i)"
                    class="correct-answer"
                  >{{ conjugations[i] }}</span>
                </div>
              </template>
              <template v-else>
                <span class="conj-value" :class="{ na: conjugations[i] === '—' }">
                  {{ conjugations[i] }}
                </span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="quizMode && !showResults" class="quiz-actions">
      <button class="check-btn" @click="$emit('check')">
        ✓ Vérifier mes réponses
      </button>
    </div>

    <div v-if="quizMode && showResults" class="quiz-results">
      <div class="score-badge">
        <span class="score-number">{{ score }}</span>
        <span class="score-total">/ {{ totalQuestions }}</span>
      </div>
      <p class="score-label">
        {{ score === totalQuestions ? '🎉 Parfait !' : score >= totalQuestions / 2 ? '👏 Bien joué !' : '💪 Continue !' }}
      </p>
      <button class="retry-btn" @click="$emit('restart')">Recommencer</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { verbs, sujets, tempsLabels, tempsList, verbNames } from '../data/verbs.js'

const props = defineProps({
  search: String,
  selectedVerb: String,
  selectedTemps: String,
  quizMode: Boolean,
  quizAnswers: Object,
  showResults: Boolean,
})

const emit = defineEmits([
  'update:search',
  'selectVerb',
  'selectTemps',
  'toggleQuiz',
  'updateAnswer',
  'check',
  'restart',
])

const data = computed(() => verbs[props.selectedVerb])
const conjugations = computed(() => data.value[props.selectedTemps])

const filteredVerbs = computed(() =>
  verbNames.filter(v => v.toLowerCase().includes((props.search || '').toLowerCase()))
)

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

function isCorrect(i) {
  return normalize(props.quizAnswers[i]) === normalize(conjugations.value[i])
}

const totalQuestions = computed(() =>
  sujets.filter((_, i) => conjugations.value[i] !== '—').length
)

const score = computed(() =>
  sujets.filter((_, i) =>
    conjugations.value[i] !== '—' && isCorrect(i)
  ).length
)

function rowClass(i) {
  if (props.showResults && props.quizMode && conjugations.value[i] !== '—') {
    return isCorrect(i) ? 'row-correct' : 'row-wrong'
  }
  return i % 2 === 0 ? 'row-even' : ''
}

function inputClass(i) {
  if (!props.showResults) return ''
  return isCorrect(i) ? 'input-correct' : 'input-wrong'
}

function selectVerb(v) { emit('selectVerb', v) }
function selectTemps(t) { emit('selectTemps', t) }
function toggleQuiz() { emit('toggleQuiz') }
function updateAnswer(i, val) { emit('updateAnswer', i, val) }
</script>

<style scoped>
.search-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.search-wrapper {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  font-size: 14px;
  outline: none;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: #2980b9;
  box-shadow: 0 0 0 3px rgba(41, 128, 185, 0.1);
}

.quiz-btn {
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  background: #2980b9;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}

.quiz-btn:hover {
  background: #2471a3;
  transform: translateY(-1px);
}

.quiz-btn.active {
  background: #e74c3c;
}

.quiz-btn.active:hover {
  background: #c0392b;
}

.verb-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
}

.verb-chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-weight: 400;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.verb-chip:hover {
  border-color: #2980b9;
  color: #2980b9;
  background: var(--chip-verb-hover-bg);
}

.verb-chip.selected {
  border-color: #2980b9;
  background: var(--chip-verb-selected-bg);
  color: #2980b9;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(41, 128, 185, 0.15);
}

.no-results {
  font-size: 14px;
  color: var(--text-faintest);
  font-style: italic;
  padding: 8px 0;
}

.verb-hero {
  background: linear-gradient(135deg, var(--hero-gradient-1) 0%, var(--hero-gradient-2) 100%);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px var(--shadow-sm);
}

.verb-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--verb-name-color);
  margin-bottom: 2px;
}

.verb-groupe {
  font-size: 13px;
  color: var(--text-faint);
  font-style: italic;
}

.temps-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.temps-chip {
  padding: 7px 16px;
  border-radius: 22px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-weight: 400;
  font-size: 13px;
  color: var(--text-muted);
  transition: all 0.15s;
}

.temps-chip:hover {
  border-color: #8e44ad;
  color: #8e44ad;
  background: var(--chip-temps-hover-bg);
}

.temps-chip.selected {
  border-color: #8e44ad;
  background: var(--chip-temps-selected-bg);
  color: #8e44ad;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(142, 68, 173, 0.15);
}

.table-heading {
  font-size: 16px;
  font-weight: 600;
  color: #8e44ad;
  margin-bottom: 12px;
}

.table-heading em {
  font-style: italic;
}

.table-wrapper {
  background: var(--surface);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 6px var(--shadow-md);
}

.conj-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.conj-table thead tr {
  border-bottom: 2px solid #8e44ad;
}

.conj-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: #8e44ad;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conj-table th:first-child {
  width: 40%;
}

.conj-table tbody tr {
  border-bottom: 1px solid var(--border-table);
  transition: background 0.2s;
}

.conj-table tbody tr:last-child {
  border-bottom: none;
}

.row-even {
  background: var(--row-even-bg);
}

.row-correct {
  background: var(--row-correct-bg) !important;
}

.row-wrong {
  background: var(--row-wrong-bg) !important;
}

.sujet-cell {
  padding: 12px 16px;
  font-weight: 500;
  color: var(--text-secondary);
}

.conj-cell {
  padding: 12px 16px;
}

.conj-value {
  font-weight: 600;
  color: var(--conj-value-color);
}

.conj-value.na {
  color: var(--conj-na-color);
}

.quiz-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quiz-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1.5px solid var(--border-light);
  font-size: 15px;
  width: 100%;
  max-width: 220px;
  outline: none;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.quiz-input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 0 3px rgba(142, 68, 173, 0.1);
}

.quiz-input:disabled {
  background: var(--input-disabled-bg);
}

.input-correct {
  border-color: #27ae60 !important;
}

.input-wrong {
  border-color: #e74c3c !important;
}

.correct-answer {
  color: #27ae60;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

.quiz-actions {
  text-align: center;
  margin-top: 18px;
}

.check-btn {
  padding: 12px 32px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.25);
  transition: transform 0.15s, box-shadow 0.15s;
}

.check-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(39, 174, 96, 0.3);
}

.quiz-results {
  text-align: center;
  margin-top: 20px;
  padding: 20px;
  background: var(--quiz-results-bg);
  border-radius: 16px;
  box-shadow: 0 2px 8px var(--shadow-md);
}

.score-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}

.score-number {
  font-size: 36px;
  font-weight: 700;
  color: #2980b9;
}

.score-total {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-faint);
}

.score-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--score-label-color);
  margin: 8px 0 16px;
}

.retry-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: #2980b9;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #2471a3;
}
</style>
