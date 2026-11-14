<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { talentBranchTone, talentNodeShape } from '../../utils/talentVisuals'

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

const selectedTone = computed(() => talentBranchTone(props.selected?.branch))
const selectedShape = computed(() => talentNodeShape(props.selected?.type))

function formatBonus(bonus) {
  if (!bonus) return ''
  return Object.entries(bonus)
    .map(([k, v]) => `+${v} ${t(`talents.stats.${k}`)}`)
    .join(', ')
}
</script>

<template>
  <aside class="talent-sidebar" data-testid="talent-sidebar">
    <div class="talent-sidebar__points" :class="{ 'talent-sidebar__points--none': !points }">
      <p class="talent-sidebar__points-label">{{ t('talents.pointsLabel') }}</p>
      <p :key="points" class="talent-sidebar__points-value" data-testid="talent-points">{{ points }}</p>
    </div>

    <section class="talent-sidebar__selected" :data-tone="selected ? selectedTone : 'neutral'">
      <Transition name="rise" mode="out-in">
        <div v-if="selected" :key="selected.nodeId">
          <p class="talent-sidebar__type">
            <span class="shape" :class="`shape--${selectedShape}`" aria-hidden="true" />
            {{ t(`talents.types.${selected.type}`) }} · {{ t(`talents.branches.${selected.branch}`) }}
          </p>
          <h3 class="talent-sidebar__name">{{ nodeName(selected) }}</h3>
          <p v-if="nodeDesc(selected)" class="mt-2 leading-relaxed text-ink">{{ nodeDesc(selected) }}</p>
          <p v-if="selected.statBonus" class="talent-sidebar__bonus">
            {{ formatBonus(selected.statBonus) }}
          </p>
          <button
            v-if="canUnlockSelected"
            type="button"
            class="btn-primary btn-lg btn-block mt-4"
            data-testid="unlock-talent"
            :disabled="actionLoading"
            @click="emit('unlock', selected.nodeId)"
          >
            {{ actionLoading ? t('talents.working') : t('talents.unlock') }}
          </button>
          <p v-else class="mt-3 text-sm text-ink-muted">{{ t('talents.unlockHint') }}</p>
        </div>
        <p v-else class="text-ink-muted">{{ t('talents.selectedNone') }}</p>
      </Transition>
    </section>

    <section class="talent-sidebar__block">
      <h2 class="t-kicker">{{ t('talents.statsTitle') }}</h2>
      <ul class="talent-sidebar__stats">
        <li v-for="key in STAT_KEYS" :key="key" :class="{ 'is-zero': !stats[key] }">
          <span class="talent-sidebar__stat-value">{{ stats[key] || 0 }}</span>
          <span class="talent-sidebar__stat-label">{{ t(`talents.stats.${key}`) }}</span>
        </li>
      </ul>
    </section>

    <section v-if="effects.length" class="talent-sidebar__block">
      <h2 class="t-kicker">{{ t('talents.effectsTitle') }}</h2>
      <ul class="talent-sidebar__effects">
        <li v-for="fx in effects" :key="fx.nodeId">
          <span class="lozenge" aria-hidden="true" />
          <span class="min-w-0 flex-1">{{ locale === 'en' ? fx.nameEn : fx.nameFr }}</span>
          <span class="badge">{{ fx.type }}</span>
        </li>
      </ul>
    </section>

    <button type="button" class="btn-ghost btn-block mt-6" data-testid="open-respec" @click="emit('respec')">
      {{ t('talents.respecOpen') }}
    </button>
  </aside>
</template>

<style scoped>
.talent-sidebar {
  display: flex;
  flex-direction: column;
}

.talent-sidebar__points {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  background: var(--color-leaf-fill);
  color: #10261a;
}

.talent-sidebar__points--none {
  background: var(--color-bg-soft);
  color: var(--color-ink-muted);
}

.talent-sidebar__points-label {
  max-width: 6rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.talent-sidebar__points-value {
  font-family: var(--font-display);
  font-size: clamp(4rem, 3rem + 3vw, 5.5rem);
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.78;
  letter-spacing: -0.03em;
  animation: pop-in 380ms var(--ease-out-quint) both;
}

.talent-sidebar__selected {
  min-height: 7rem;
  padding: 1.1rem 1.15rem 1.25rem;
  border-top: 6px solid var(--tone-fill);
  background: var(--color-bg-card);
  transition: border-color var(--dur-base) ease;
}

.talent-sidebar__type {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tone);
}

.talent-sidebar__name {
  margin-top: 0.5rem;
  font-size: 1.625rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1;
  letter-spacing: -0.015em;
}

.talent-sidebar__bonus {
  margin-top: 0.6rem;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--tone);
}

.talent-sidebar__block {
  margin-top: 1.5rem;
}

.talent-sidebar__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 1.25rem;
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
}

.talent-sidebar__stats li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-top: 1px solid var(--color-line);
}

.talent-sidebar__stat-value {
  min-width: 1.75rem;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--color-ink);
}

.talent-sidebar__stat-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-ink-muted);
}

.talent-sidebar__stats .is-zero .talent-sidebar__stat-value {
  color: var(--color-line-strong);
}

.talent-sidebar__effects {
  display: flex;
  flex-direction: column;
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.talent-sidebar__effects li {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0;
  border-top: 1px solid var(--color-line);
}

.talent-sidebar__effects .lozenge {
  color: var(--color-vermilion);
}
</style>
