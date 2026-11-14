<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'VictoryRewards' })

const props = defineProps({
  rewards: { type: Object, default: null },
  state: { type: String, default: 'victory' },
  /** Combat au sein d'un parcours : pas de loot immédiat */
  midRun: { type: Boolean, default: false },
  continueLabel: { type: String, default: null },
})

const emit = defineEmits(['dismiss'])

const { t } = useI18n()

const isVictory = computed(() => props.state === 'victory')

const title = computed(() => {
  if (props.midRun && isVictory.value) return t('combat.stepCleared')
  if (isVictory.value) return t('combat.victory')
  if (props.state === 'forfeited') return t('combat.forfeited')
  return t('combat.defeat')
})

const ctaLabel = computed(
  () =>
    props.continueLabel ||
    (props.midRun ? t('combat.continueRun') : t('combat.backToMissions'))
)

const lines = computed(() => {
  const r = props.rewards
  if (!r || r.error) return []
  const out = []
  if (r.xp > 0) out.push({ key: 'xp', label: t('combat.rewardXp', { n: r.xp }) })
  if (r.ryos > 0) out.push({ key: 'ryos', label: t('combat.rewardRyos', { n: r.ryos }) })
  if (r.leveledUp) {
    out.push({
      key: 'level',
      label: t('combat.rewardLevel', {
        n: r.levelsGained,
        talent: r.talentPointsGained || 0,
      }),
    })
  }
  if (r.card) {
    out.push({
      key: 'card',
      label: t('combat.rewardCard', {
        name: r.card.nameFr || r.card.nameEn || '…',
      }),
    })
  } else if (r.cardRolled === false && (r.xp > 0 || r.ryos > 0)) {
    out.push({ key: 'no-card', label: t('combat.rewardNoCard') })
  }
  if (r.runMult) {
    out.push({ key: 'run', label: t('combat.rewardRunBonus', { n: r.runMult }) })
  }
  return out
})
</script>

<template>
  <div
    class="victory"
    :class="`victory--${state}`"
    data-testid="victory-rewards"
    role="dialog"
    :aria-label="title"
  >
    <p class="victory__title">{{ title }}</p>

    <p v-if="midRun && isVictory" class="victory__muted">
      {{ t('combat.stepClearedHint') }}
    </p>

    <ul v-else-if="isVictory && lines.length" class="victory__list">
      <li v-for="line in lines" :key="line.key">{{ line.label }}</li>
    </ul>
    <p v-else-if="isVictory && rewards?.error" class="victory__muted">
      {{ t('combat.rewardError') }}
    </p>
    <p v-else-if="isVictory && !rewards && !midRun" class="victory__muted">
      {{ t('combat.rewardPending') }}
    </p>

    <button type="button" class="btn-primary text-xs victory__cta" @click="emit('dismiss')">
      {{ ctaLabel }}
    </button>
  </div>
</template>

<style scoped>
.victory {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem 1.5rem;
  text-align: center;
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  background: color-mix(in srgb, var(--color-bg-soft) 88%, transparent);
  animation: victory-in 0.5s ease;
}

.victory--victory {
  border-color: color-mix(in srgb, var(--color-win) 45%, transparent);
}

.victory--defeat,
.victory--forfeited {
  border-color: color-mix(in srgb, var(--color-fire) 40%, transparent);
}

.victory__title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  line-height: 1.1;
}

.victory--victory .victory__title {
  color: var(--color-win);
}

.victory--defeat .victory__title,
.victory--forfeited .victory__title {
  color: var(--color-fire);
}

.victory__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}

.victory__muted {
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.victory__cta {
  margin-top: 0.25rem;
}

@keyframes victory-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
