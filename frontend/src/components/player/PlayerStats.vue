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

const STAT_ORDER = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'vitesse',
  'intelligence',
  'dexterity',
  'maxHp',
]

const rows = computed(() => {
  const total = props.stats?.total || props.stats || {}
  return STAT_ORDER.map((key) => {
    const value = Number(total[key]) || 0
    const pct = Math.min(100, Math.round((value / props.scaleMax) * 100))
    return { key, value, pct }
  })
})
</script>

<template>
  <section class="space-y-4" data-testid="player-stats">
    <header>
      <h2 class="font-display text-xl text-ink">{{ t('player.statsTitle') }}</h2>
      <p class="mt-1 text-sm text-ink-muted">{{ t('player.statsLead') }}</p>
    </header>

    <ul class="space-y-3">
      <li v-for="row in rows" :key="row.key" class="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3">
        <span class="text-xs uppercase tracking-[0.12em] text-ink-muted">
          {{ t(`player.stats.${row.key}`) }}
        </span>
        <div class="h-2 overflow-hidden border border-line bg-bg-soft">
          <div
            class="h-full bg-accent transition-[width] duration-500 ease-out"
            :style="{ width: `${row.pct}%` }"
            :data-stat="row.key"
          />
        </div>
        <span class="text-right font-display text-sm text-ink tabular-nums">{{ row.value }}</span>
      </li>
    </ul>
  </section>
</template>
