<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'TalentSidebar' })

const props = defineProps({
  points: { type: Number, default: 0 },
  bonuses: { type: Object, default: null },
  effects: { type: Array, default: () => [] },
  selected: { type: Object, default: null },
  canUnlockSelected: { type: Boolean, default: false },
  actionLoading: { type: Boolean, default: false },
  locale: { type: String, default: 'fr' },
})

const emit = defineEmits(['unlock', 'respec'])

const { t } = useI18n()

const STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'vitesse',
  'intelligence',
  'dexterity',
  'maxHp',
]

const stats = computed(() => props.bonuses?.stats || {})

function nodeName(node) {
  if (!node) return ''
  return props.locale === 'en' ? node.nameEn : node.nameFr
}

function nodeDesc(node) {
  if (!node) return ''
  return props.locale === 'en' ? node.descriptionEn : node.descriptionFr
}

function formatBonus(bonus) {
  if (!bonus) return ''
  return Object.entries(bonus)
    .map(([k, v]) => `+${v} ${t(`talents.stats.${k}`)}`)
    .join(', ')
}
</script>

<template>
  <aside class="talent-sidebar" data-testid="talent-sidebar">
    <div class="talent-sidebar__points">
      <p class="page-kicker">{{ t('talents.pointsLabel') }}</p>
      <p class="talent-sidebar__points-value" data-testid="talent-points">{{ points }}</p>
    </div>

    <section class="mt-6">
      <h2 class="font-display text-lg text-ink">{{ t('talents.statsTitle') }}</h2>
      <ul class="mt-3 space-y-1.5">
        <li
          v-for="key in STAT_KEYS"
          :key="key"
          class="flex items-baseline justify-between gap-3 text-sm"
        >
          <span class="text-ink-muted">{{ t(`talents.stats.${key}`) }}</span>
          <span class="font-mono text-ink">{{ stats[key] || 0 }}</span>
        </li>
      </ul>
    </section>

    <section v-if="effects.length" class="mt-6">
      <h2 class="font-display text-lg text-ink">{{ t('talents.effectsTitle') }}</h2>
      <ul class="mt-3 space-y-2">
        <li
          v-for="fx in effects"
          :key="fx.nodeId"
          class="border-l-2 border-accent/50 pl-3 text-sm text-ink-muted"
        >
          <span class="text-ink">{{ locale === 'en' ? fx.nameEn : fx.nameFr }}</span>
          <span class="ml-2 text-[10px] uppercase tracking-wider text-accent">{{ fx.type }}</span>
        </li>
      </ul>
    </section>

    <section v-if="selected" class="mt-6 border-t border-line/60 pt-5">
      <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
        {{ t(`talents.types.${selected.type}`) }} · {{ t(`talents.branches.${selected.branch}`) }}
      </p>
      <h3 class="mt-1 font-display text-xl text-ink">{{ nodeName(selected) }}</h3>
      <p v-if="nodeDesc(selected)" class="mt-2 text-sm text-ink-muted">{{ nodeDesc(selected) }}</p>
      <p v-if="selected.statBonus" class="mt-2 text-sm text-accent">
        {{ formatBonus(selected.statBonus) }}
      </p>
      <button
        v-if="canUnlockSelected"
        type="button"
        class="btn-primary mt-4 w-full text-xs"
        data-testid="unlock-talent"
        :disabled="actionLoading"
        @click="emit('unlock', selected.nodeId)"
      >
        {{ actionLoading ? t('talents.working') : t('talents.unlock') }}
      </button>
      <p v-else class="mt-3 text-xs text-ink-muted">{{ t('talents.unlockHint') }}</p>
    </section>

    <button
      type="button"
      class="btn-ghost mt-8 w-full text-xs"
      data-testid="open-respec"
      @click="emit('respec')"
    >
      {{ t('talents.respecOpen') }}
    </button>
  </aside>
</template>

<style scoped>
.talent-sidebar {
  border: 1px solid color-mix(in srgb, var(--color-line, #3a4a40) 70%, transparent);
  background: color-mix(in srgb, var(--color-panel, #151a17) 88%, transparent);
  padding: 1.25rem 1.35rem;
}

.talent-sidebar__points-value {
  margin-top: 0.35rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: 2.5rem;
  line-height: 1;
  color: var(--color-accent, #c9a66b);
  animation: points-pulse 2.4s ease-in-out infinite;
}

@keyframes points-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.72;
  }
}
</style>
