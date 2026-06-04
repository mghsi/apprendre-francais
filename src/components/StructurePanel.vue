<template>
  <div v-if="enabled && structure" class="sp-card" :class="{ recording }">
    <header class="sp-head">
      <div class="sp-title-row">
        <h3 class="sp-title">
          🧭 Structure suggérée
        </h3>
        <span class="sp-name">{{ structure.name }}</span>
      </div>
      <div class="sp-actions">
        <button
          class="sp-btn"
          @click="cycle"
          :title="`Structure ${currentIdx + 1} / ${structures.length}`"
        >🎲 Autre structure</button>
        <button
          class="sp-btn ghost"
          @click="$emit('disable')"
          title="Cacher la structure et improviser"
        >🙈 Improviser</button>
      </div>
    </header>

    <p class="sp-desc">{{ structure.description }}</p>

    <div class="sp-tools">
      <button class="sp-tool-btn" @click="expandAll">⬇ Tout déplier</button>
      <button class="sp-tool-btn" @click="collapseAll">⬆ Tout replier</button>
    </div>

    <ol class="sp-steps">
      <li
        v-for="(step, i) in stepsWithMeta"
        :key="`${currentIdx}-${i}`"
        class="sp-step"
        :class="{
          current: i === currentStepIdx,
          done: recording && elapsedSeconds >= step.endAt,
          upcoming: recording && elapsedSeconds < step.startAt,
          open: isOpen(i)
        }"
      >
        <button
          type="button"
          class="sp-step-toggle"
          :aria-expanded="isOpen(i)"
          @click="toggle(i)"
        >
          <div class="sp-step-marker">
            <span class="sp-step-num">{{ i + 1 }}</span>
          </div>
          <div class="sp-step-summary">
            <div class="sp-step-head">
              <span class="sp-step-label">{{ step.label }}</span>
              <span class="sp-step-time">
                {{ formatRange(step.startAt, step.endAt) }}
                <span class="sp-step-dur">· {{ step.seconds }}s</span>
              </span>
            </div>
            <p v-if="!isOpen(i)" class="sp-step-hint-short">{{ step.hint }}</p>
          </div>
          <span class="sp-step-chevron" :class="{ open: isOpen(i) }">▾</span>
        </button>

        <div v-show="isOpen(i)" class="sp-step-detail">
          <p class="sp-step-hint">{{ step.hint }}</p>
          <div v-if="step.templates && step.templates.length" class="sp-templates-wrap">
            <div class="sp-templates-head">💬 Phrases-modèles à réutiliser</div>
            <ul class="sp-templates">
              <li v-for="(tpl, j) in step.templates" :key="j" class="sp-template">
                <span class="sp-template-quote">«</span>
                <span class="sp-template-text">{{ tpl }}</span>
                <span class="sp-template-quote">»</span>
              </li>
            </ul>
          </div>
          <p v-else class="sp-no-templates">
            Pas de phrases-modèles pour cette étape — improvisez librement.
          </p>
        </div>

        <div
          v-if="recording && i === currentStepIdx"
          class="sp-step-progress"
        >
          <div
            class="sp-step-progress-fill"
            :style="{ width: stepProgressPct + '%' }"
          ></div>
        </div>
      </li>
    </ol>

    <p class="sp-foot">
      {{ structures.length }} structures disponibles — cliquez sur une étape
      pour voir les phrases-modèles, ou alternez avec 🎲.
    </p>
  </div>

  <div v-else-if="!enabled" class="sp-collapsed">
    <span>🙈 Structure cachée — vous improvisez librement.</span>
    <button class="sp-btn" @click="$emit('enable')">🧭 Réafficher</button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  structures: { type: Array, required: true },
  currentIdx: { type: Number, default: 0 },
  elapsedSeconds: { type: Number, default: 0 },
  recording: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
})
const emit = defineEmits(['update:currentIdx', 'enable', 'disable'])

const structure = computed(
  () => props.structures[props.currentIdx] || props.structures[0]
)

// Per-step expanded state. Default: only the first step is open so the user
// sees how it works at a glance without being overwhelmed.
const openSteps = ref(new Set([0]))

function isOpen(i) { return openSteps.value.has(i) }
function toggle(i) {
  const next = new Set(openSteps.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  openSteps.value = next
}
function expandAll() {
  openSteps.value = new Set((structure.value?.steps || []).map((_, i) => i))
}
function collapseAll() {
  openSteps.value = new Set()
}

// Reset expansion when switching structure (different step set)
watch(() => props.currentIdx, () => {
  openSteps.value = new Set([0])
})

// Annotate steps with cumulative startAt / endAt for highlight + progress
const stepsWithMeta = computed(() => {
  const out = []
  let acc = 0
  for (const s of structure.value?.steps || []) {
    out.push({
      ...s,
      startAt: acc,
      endAt: acc + s.seconds,
    })
    acc += s.seconds
  }
  return out
})

const currentStepIdx = computed(() => {
  if (!props.recording) return -1
  const t = props.elapsedSeconds
  const arr = stepsWithMeta.value
  for (let i = 0; i < arr.length; i++) {
    if (t < arr[i].endAt) return i
  }
  return arr.length - 1
})

// Auto-expand the active step while recording (without collapsing the others
// the user manually opened).
watch(currentStepIdx, (idx) => {
  if (idx < 0) return
  if (!openSteps.value.has(idx)) {
    const next = new Set(openSteps.value)
    next.add(idx)
    openSteps.value = next
  }
})

const stepProgressPct = computed(() => {
  const i = currentStepIdx.value
  if (i < 0) return 0
  const step = stepsWithMeta.value[i]
  const elapsedInStep = props.elapsedSeconds - step.startAt
  return Math.min(100, Math.max(0, (elapsedInStep / step.seconds) * 100))
})

function cycle() {
  const next = (props.currentIdx + 1) % props.structures.length
  emit('update:currentIdx', next)
}

function formatRange(start, end) {
  return `${fmt(start)} → ${fmt(end)}`
}
function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec}s`
  if (sec === 0) return `${m}'`
  return `${m}'${String(sec).padStart(2, '0')}`
}
</script>

<style scoped>
.sp-card {
  border: 1.5px solid #16a08566;
  background: #16a0850a;
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s;
}
.sp-card.recording {
  border-color: #16a085;
  background: #16a08512;
}

.sp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.sp-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.sp-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--title-color);
}
.sp-name {
  font-size: 13px;
  font-weight: 600;
  color: #16a085;
  padding: 2px 10px;
  background: #16a08514;
  border-radius: 8px;
}
.sp-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.sp-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.sp-btn:hover { border-color: #16a085; color: #16a085; }
.sp-btn.ghost { background: transparent; }

.sp-desc {
  font-size: 12.5px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.5;
}

.sp-tools {
  display: flex;
  gap: 6px;
}
.sp-tool-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-faint);
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.sp-tool-btn:hover { border-color: #16a085; color: #16a085; }

.sp-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  counter-reset: step;
}
.sp-step {
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
  transition: all 0.2s;
}
.sp-step:hover { border-color: #16a08580; }
.sp-step.current {
  border-color: #16a085;
  background: #16a08518;
  box-shadow: 0 2px 8px #16a08533;
}
.sp-step.open { border-color: #16a08599; }
.sp-step.done { opacity: 0.6; }
.sp-step.done .sp-step-num {
  background: #27ae60;
  color: white;
}
.sp-step.current .sp-step-num {
  background: #16a085;
  color: white;
  animation: pulseMarker 1.4s ease-in-out infinite;
}
@keyframes pulseMarker {
  0%, 100% { box-shadow: 0 0 0 0 #16a08566; }
  50%      { box-shadow: 0 0 0 4px #16a08500; }
}
.sp-step.upcoming { opacity: 0.8; }

/* Clickable header (button covering the whole row) */
.sp-step-toggle {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: background 0.15s;
}
.sp-step-toggle:hover { background: var(--surface-alt); }
.sp-step.current .sp-step-toggle:hover { background: #16a08522; }

.sp-step-marker {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 1px;
}
.sp-step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-alt);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: all 0.2s;
}
.sp-step-summary {
  flex: 1;
  min-width: 0;
}
.sp-step-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.sp-step-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.sp-step-time {
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sp-step-dur {
  color: var(--text-faintest);
  font-style: italic;
}
.sp-step-hint-short {
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.4;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sp-step-chevron {
  flex-shrink: 0;
  font-size: 12px;
  color: #16a085;
  margin-top: 2px;
  transition: transform 0.2s;
}
.sp-step-chevron.open { transform: rotate(180deg); }

.sp-step-detail {
  padding: 0 12px 12px 46px; /* aligned with text, past the marker */
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sp-step-hint {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.sp-templates-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sp-templates-head {
  font-size: 11px;
  font-weight: 700;
  color: #16a085;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sp-templates {
  list-style: none;
  padding: 8px 12px;
  margin: 0;
  background: var(--surface-alt);
  border-left: 3px solid #16a085;
  border-radius: 0 8px 8px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sp-template {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
  font-style: italic;
  display: flex;
  gap: 4px;
  align-items: flex-start;
}
.sp-template-quote {
  color: #16a085;
  font-weight: 700;
  font-style: normal;
  flex-shrink: 0;
}
.sp-template-text { flex: 1; }
.sp-no-templates {
  font-size: 11.5px;
  color: var(--text-faintest);
  font-style: italic;
  margin: 0;
}

.sp-step-progress {
  height: 4px;
  background: var(--surface-alt);
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}
.sp-step-progress-fill {
  height: 100%;
  background: #16a085;
  transition: width 0.2s linear;
}

.sp-foot {
  font-size: 11px;
  color: var(--text-faint);
  text-align: right;
  font-style: italic;
  margin: 0;
}

.sp-collapsed {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: 1.5px dashed var(--border);
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--text-muted);
  background: var(--surface-alt);
}
</style>
