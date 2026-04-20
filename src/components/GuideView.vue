<template>
  <div class="guide-list">
    <div
      v-for="(g, idx) in guideData"
      :key="idx"
      class="guide-card"
      :style="{ borderColor: g.color + '30' }"
    >
      <button
        class="guide-header"
        :class="{ open: openIndex === idx }"
        :style="{ background: openIndex === idx ? g.color + '0a' : '' }"
        @click="toggle(idx)"
      >
        <span class="guide-title" :style="{ color: g.color }">{{ g.temps }}</span>
        <span class="guide-usage">{{ g.usage }}</span>
        <span
          class="guide-chevron"
          :style="{ color: g.color, transform: openIndex === idx ? 'rotate(180deg)' : '' }"
        >▼</span>
      </button>

      <Transition name="slide">
        <div v-if="openIndex === idx" class="guide-body">
          <div class="guide-section">
            <h4 class="guide-section-title" :style="{ color: g.color }">Construction</h4>
            <div
              v-for="(c, i) in g.construction"
              :key="i"
              class="construction-card"
              :style="{ borderLeftColor: g.color }"
            >
              <div class="construction-groupe">{{ c.groupe }}</div>
              <div class="construction-rule">{{ c.rule }}</div>
              <div v-if="c.ex" class="construction-ex">{{ c.ex }}</div>
            </div>
          </div>

          <div class="guide-section">
            <h4 class="guide-section-title" :style="{ color: g.color }">Exemples</h4>
            <div v-for="(e, i) in g.exemples" :key="i" class="exemple-line">{{ e }}</div>
          </div>

          <div class="astuce-box" :style="{ background: g.color + '08' }">
            <span class="astuce-label" :style="{ color: g.color }">💡 Astuce : </span>
            <span class="astuce-text">{{ g.astuce }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { guideData } from '../data/verbs.js'

const openIndex = ref(null)

function toggle(idx) {
  openIndex.value = openIndex.value === idx ? null : idx
}
</script>

<style scoped>
.guide-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-card {
  border-radius: 14px;
  border: 1px solid;
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 1px 3px var(--shadow-sm);
  transition: box-shadow 0.2s;
}

.guide-card:hover {
  box-shadow: 0 2px 8px var(--shadow-hover);
}

.guide-header {
  width: 100%;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  border: none;
  text-align: left;
  background: transparent;
  gap: 12px;
  transition: background 0.2s;
}

.guide-header:hover {
  background: var(--surface-hover);
}

.guide-title {
  font-weight: 700;
  font-size: 16px;
  white-space: nowrap;
}

.guide-usage {
  flex: 1;
  font-size: 13px;
  color: var(--text-faint);
  font-style: italic;
}

.guide-chevron {
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.25s ease;
}

.guide-body {
  padding: 0 18px 18px;
}

.guide-section {
  margin-top: 16px;
}

.guide-section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
}

.construction-card {
  background: var(--construction-bg);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-left: 3px solid;
}

.construction-groupe {
  font-weight: 600;
  font-size: 13px;
  color: var(--construction-groupe);
  margin-bottom: 4px;
}

.construction-rule {
  font-size: 14px;
  color: var(--construction-text);
  line-height: 1.5;
}

.construction-ex {
  font-size: 13px;
  color: var(--construction-ex);
  font-style: italic;
  margin-top: 6px;
  white-space: pre-line;
}

.exemple-line {
  font-size: 14px;
  color: var(--exemple-text);
  padding: 5px 0;
  line-height: 1.5;
}

.astuce-box {
  margin-top: 16px;
  border-radius: 10px;
  padding: 12px 16px;
  line-height: 1.6;
}

.astuce-label {
  font-size: 13px;
  font-weight: 700;
}

.astuce-text {
  font-size: 13px;
  color: var(--astuce-text);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 800px;
}
</style>
