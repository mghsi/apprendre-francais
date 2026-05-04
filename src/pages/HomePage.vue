<template>
  <div class="home">
    <section class="hero">
      <h1 class="hero-title">
        <span class="hero-flag">🇫🇷</span>
        Apprendre le français
      </h1>
      <p class="hero-tagline">
        Conjugaison, vocabulaire et préparation au TCF — un seul tableau de bord.
      </p>
    </section>

    <section class="dash-grid">
      <article
        v-for="m in modules"
        :key="m.id"
        class="dash-card"
        :class="{ disabled: m.disabled }"
        :style="{
          '--accent': m.color,
          '--accent-soft': m.color + '14',
          '--accent-hover': m.color + '30'
        }"
        @click="!m.disabled && navigate(m.path)"
        tabindex="0"
        @keydown.enter="!m.disabled && navigate(m.path)"
      >
        <div class="dash-icon">{{ m.icon }}</div>
        <div class="dash-body">
          <h2 class="dash-title">{{ m.title }}</h2>
          <p class="dash-desc">{{ m.description }}</p>
          <ul class="dash-features">
            <li v-for="(f, i) in m.features" :key="i">{{ f }}</li>
          </ul>
        </div>
        <div class="dash-footer">
          <span class="dash-cta">
            {{ m.disabled ? 'Bientôt' : 'Commencer →' }}
          </span>
          <span v-if="m.badge" class="dash-badge" :style="{ background: m.color + '24', color: m.color }">
            {{ m.badge }}
          </span>
        </div>
      </article>
    </section>

    <section class="tcf-strip">
      <h3 class="tcf-strip-title">Préparation au TCF</h3>
      <p class="tcf-strip-sub">Les 4 épreuves dans un environnement proche de l'examen.</p>
      <div class="tcf-quick">
        <button
          v-for="s in tcfShortcuts"
          :key="s.id"
          class="tcf-quick-btn"
          :class="{ disabled: s.disabled }"
          :style="{ '--accent': s.color }"
          @click="!s.disabled && navigate(s.path)"
          :disabled="s.disabled"
        >
          <span class="tcf-quick-icon">{{ s.icon }}</span>
          <span class="tcf-quick-name">{{ s.short }}</span>
          <span class="tcf-quick-full">{{ s.full }}</span>
          <span v-if="!s.disabled" class="tcf-quick-status ready">prêt</span>
          <span v-else class="tcf-quick-status">à venir</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { navigate } from '../composables/useRouter.js'

const modules = [
  {
    id: 'conjugaison',
    icon: '📋',
    title: 'Conjugaison',
    description: "Tableaux, explorateur de verbes et guide des temps (B1+).",
    features: ['Tables de conjugaison', 'Explorateur (~7 000 verbes)', 'Guide des temps', 'Mode quiz'],
    color: '#2980b9',
    path: '/conjugaison',
    badge: 'B1+'
  },
  {
    id: 'tcf',
    icon: '🎓',
    title: 'TCF',
    description: "Préparation aux 4 épreuves : CO, CE, EO, EE — au format de l'examen en ligne.",
    features: ['Compréhension orale', 'Compréhension écrite', 'Expression orale', 'Expression écrite'],
    color: '#8e44ad',
    path: '/tcf',
    badge: '4 épreuves'
  },
  {
    id: 'vocab',
    icon: '📚',
    title: 'Vocabulaire',
    description: "Listes thématiques, flashcards et révisions espacées.",
    features: ['Thèmes', 'Flashcards', 'Répétition espacée'],
    color: '#27ae60',
    path: '/vocabulaire',
    disabled: true
  }
]

const tcfShortcuts = [
  { id: 'co', short: 'CO', full: 'Compréhension orale', icon: '🎧', color: '#3498db', path: '/tcf/co', disabled: true },
  { id: 'ce', short: 'CE', full: 'Compréhension écrite', icon: '📖', color: '#16a085', path: '/tcf/ce', disabled: true },
  { id: 'eo', short: 'EO', full: 'Expression orale', icon: '🎤', color: '#e67e22', path: '/tcf/eo', disabled: true },
  { id: 'ee', short: 'EE', full: 'Expression écrite', icon: '✍️', color: '#8e44ad', path: '/tcf/ee', disabled: false }
]
</script>

<style scoped>
.home { display: flex; flex-direction: column; gap: 28px; }

/* Hero */
.hero {
  text-align: center;
  padding: 14px 8px 4px;
  background:
    radial-gradient(ellipse at 30% 0%, var(--hero-gradient-1) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 100%, var(--hero-gradient-2) 0%, transparent 60%);
  border-radius: 18px;
}
.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--title-color);
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}
.hero-flag { margin-right: 4px; }
.hero-tagline {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 540px;
  margin: 0 auto;
  line-height: 1.55;
}

/* Grille de cartes */
.dash-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.dash-card {
  display: flex;
  flex-direction: column;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 18px;
  padding: 18px;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
  outline: none;
  position: relative;
  overflow: hidden;
}
.dash-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.2s;
}
.dash-card:hover,
.dash-card:focus-visible {
  transform: translateY(-3px);
  border-color: var(--accent-hover);
  box-shadow: 0 8px 24px var(--shadow-md);
}
.dash-card:hover::before,
.dash-card:focus-visible::before { opacity: 1; }
.dash-card.disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.dash-card.disabled:hover { transform: none; box-shadow: none; }

.dash-icon {
  font-size: 36px;
  line-height: 1;
  margin-bottom: 8px;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
}
.dash-body { flex: 1; }
.dash-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.dash-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
  margin-bottom: 8px;
}
.dash-features {
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
}
.dash-features li {
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.7;
  position: relative;
  padding-left: 14px;
}
.dash-features li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: 700;
}
.dash-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
}
.dash-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}
.dash-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
}

/* Bandeau TCF */
.tcf-strip {
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: var(--surface);
}
.tcf-strip-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.tcf-strip-sub {
  font-size: 12px;
  color: var(--text-faint);
  margin-bottom: 12px;
}
.tcf-quick {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.tcf-quick-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  transition: all 0.2s;
  text-align: left;
}
.tcf-quick-btn:not(:disabled):hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.tcf-quick-btn:disabled,
.tcf-quick-btn.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.tcf-quick-icon { font-size: 18px; }
.tcf-quick-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--accent);
  margin-top: 4px;
}
.tcf-quick-full {
  font-size: 11px;
  color: var(--text-muted);
}
.tcf-quick-status {
  margin-top: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-faintest);
}
.tcf-quick-status.ready {
  color: #27ae60;
  font-weight: 700;
}
</style>
