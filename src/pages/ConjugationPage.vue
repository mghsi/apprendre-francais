<template>
  <div class="conjugation-page">
    <nav class="sub-tab-bar">
      <button
        class="sub-tab"
        :class="{ active: view === 'conjugaison' }"
        @click="switchView('conjugaison')"
      >
        📋 Tableaux
      </button>
      <button
        class="sub-tab explorer"
        :class="{ active: view === 'explorer' }"
        @click="switchView('explorer')"
      >
        🔎 Explorer
      </button>
      <button
        class="sub-tab guide"
        :class="{ active: view === 'guide' }"
        @click="switchView('guide')"
      >
        📖 Guide
      </button>
    </nav>

    <ExplorerView v-if="view === 'explorer'" />
    <GuideView v-if="view === 'guide'" />

    <ConjugationTable
      v-if="view === 'conjugaison'"
      :search="search"
      :selectedVerb="selectedVerb"
      :selectedTemps="selectedTemps"
      :quizMode="quizMode"
      :quizAnswers="quizAnswers"
      :showResults="showResults"
      @update:search="onSearch"
      @selectVerb="onSelectVerb"
      @selectTemps="onSelectTemps"
      @toggleQuiz="onToggleQuiz"
      @updateAnswer="onUpdateAnswer"
      @check="showResults = true"
      @restart="startQuiz"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GuideView from '../components/GuideView.vue'
import ConjugationTable from '../components/ConjugationTable.vue'
import ExplorerView from '../components/ExplorerView.vue'

const view = ref('conjugaison')
const search = ref('')
const selectedVerb = ref('être')
const selectedTemps = ref('présent')
const quizMode = ref(false)
const quizAnswers = ref({})
const showResults = ref(false)

function switchView(v) {
  view.value = v
  quizMode.value = false
}

function onSearch(val) {
  search.value = val
  quizMode.value = false
  showResults.value = false
}

function onSelectVerb(v) {
  selectedVerb.value = v
  quizMode.value = false
  showResults.value = false
  quizAnswers.value = {}
}

function onSelectTemps(t) {
  selectedTemps.value = t
  showResults.value = false
  quizAnswers.value = {}
}

function startQuiz() {
  quizMode.value = true
  quizAnswers.value = {}
  showResults.value = false
}

function onToggleQuiz() {
  if (quizMode.value) quizMode.value = false
  else startQuiz()
}

function onUpdateAnswer(i, val) {
  quizAnswers.value = { ...quizAnswers.value, [i]: val }
}
</script>

<style scoped>
.conjugation-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sub-tab-bar {
  display: flex;
  gap: 8px;
}

.sub-tab {
  flex: 1;
  padding: 12px 0;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-weight: 500;
  font-size: 14px;
  color: var(--text-muted);
  transition: all 0.2s;
}

.sub-tab:hover {
  border-color: #2980b9;
  color: #2980b9;
}

.sub-tab.active {
  border-color: #2980b9;
  background: var(--tab-conj-bg);
  color: #2980b9;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(41, 128, 185, 0.12);
}

.sub-tab.explorer:hover {
  border-color: #27ae60;
  color: #27ae60;
}
.sub-tab.explorer.active {
  border-color: #27ae60;
  background: #27ae6012;
  color: #27ae60;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.12);
}

.sub-tab.guide:hover {
  border-color: #e67e22;
  color: #e67e22;
}
.sub-tab.guide.active {
  border-color: #e67e22;
  background: var(--tab-guide-bg);
  color: #e67e22;
  box-shadow: 0 2px 8px rgba(230, 126, 34, 0.12);
}
</style>
