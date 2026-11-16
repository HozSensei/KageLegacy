<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'PlayerStats' })

const props = defineProps({
  stats: {
    type: Object,
    default: null,
  },
  /** Valeur max pour les barres (échelle visuelle Phase 1). */
  scaleMax: {
    type: Number,
    default: 100,
  },
})

const { t } = useI18n()

const STAT_ORDER = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'dexterity', 'maxHp']

const STAT_TONES = {
  taijutsu: 'vermilion',
  ninjutsu: 'sky',
  genjutsu: 'indigo',
  medicine: 'leaf',
  dexterity: 'gold',
  maxHp: 'vermilion',
}

const rows = computed(() => {
  const total = props.stats?.total || props.stats || {}
  return STAT_ORDER.map((key) => {
    const value = Number(total[key]) || 0
    const pct = Math.min(100, Math.round((value / props.scaleMax) * 100))
    return { key, value, pct, tone: STAT_TONES[key] || 'neutral' }
  })
})
</script>

<template>
  <section data-testid="player-stats">
    <header>
      <div class="section-head">
        <span class="section-head__index">01</span>
        <h2 class="section-head__title">{{ t('player.statsTitle') }}</h2>
        <span class="section-head__rule" aria-hidden="true" />
      </div>
      <p class="mt-2 text-ink-muted">{{ t('player.statsLead') }}</p>
    </header>

    <ul class="stat-grid stagger">
      <li v-for="row in rows" :key="row.key" class="stat-row" :data-tone="row.tone">
        <span class="stat-row__value">{{ row.value }}</span>
        <span class="stat-row__label">{{ t(`player.stats.${row.key}`) }}</span>
        <div class="meter stat-row__meter">
          <div
            class="meter__fill"
            :style="{ width: `${row.pct}%` }"
            :data-stat="row.key"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.stat-grid {
  display: grid;
  gap: 0 2.5rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.stat-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  padding: 0.9rem 0 1rem;
  border-top: 1px solid var(--color-line);
}

.stat-row__value {
  min-width: 2.75rem;
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}

.stat-row__label {
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.stat-row__meter {
  grid-column: 1 / -1;
}
</style>
