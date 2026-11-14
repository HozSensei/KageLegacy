<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusIcon from './StatusIcon.vue'
import AppIcon from '../ui/AppIcon.vue'
import { useDeltaFeed } from '../../composables/useDeltaFeed'

defineOptions({ name: 'PlayerStatus' })

const props = defineProps({
  player: { type: Object, required: true },
  /** Teinte du bloc : indigo pour soi, vermillon pour un adversaire (PvP). */
  tone: { type: String, default: 'indigo' },
  /** Libellé au-dessus du nom ; par défaut « Vous ». */
  roleLabel: { type: String, default: '' },
})

const { t } = useI18n()

const hpPct = computed(() => {
  const max = Math.max(1, props.player.maxHp || 1)
  return Math.max(0, Math.min(100, (100 * (props.player.hp || 0)) / max))
})

const chakraPips = computed(() => {
  const max = props.player.maxChakra ?? 3
  const cur = props.player.chakra ?? 0
  return Array.from({ length: max }, (_, i) => i < cur)
})

const initial = computed(() => String(props.player.name || '?').trim().charAt(0).toUpperCase())

const { deltas, hit } = useDeltaFeed(() => props.player.hp)
</script>

<template>
  <div class="fighter" :class="{ 'fighter--hit': hit }" :data-tone="tone" data-testid="player-status">
    <div class="fighter__head">
      <span class="fighter__avatar" aria-hidden="true">{{ initial }}</span>
      <div class="min-w-0 flex-1">
        <p class="fighter__role">{{ roleLabel || t('combat.youLabel') }}</p>
        <h2 class="fighter__name">{{ player.name }}</h2>
      </div>
      <p class="fighter__meta text-right">
        {{ t('combat.drawPile', { n: player.drawCount ?? 0 }) }}<br />
        {{ t('combat.discardPile', { n: player.discardCount ?? 0 }) }}
      </p>
    </div>

    <div class="fighter__hp">
      <span
        v-for="entry in deltas"
        :key="entry.id"
        class="float-num"
        :class="entry.amount < 0 ? 'float-num--loss' : 'float-num--gain'"
        aria-hidden="true"
      >
        {{ entry.amount > 0 ? '+' : '−' }}{{ Math.abs(entry.amount) }}
      </span>
      <p class="fighter__hp-row">
        <span class="fighter__hp-value">{{ player.hp }}</span>
        <span class="fighter__hp-max">
          /{{ player.maxHp }}<span class="fighter__hp-unit">{{ t('combat.hpLabel') }}</span>
        </span>
      </p>
      <div class="fighter__bar">
        <span class="fighter__bar-fill" :style="{ width: `${hpPct}%` }" />
      </div>
    </div>

    <div class="fighter__row">
      <div class="chakra" :aria-label="t('combat.chakra', { n: player.chakra, max: player.maxChakra })">
        <span class="chakra__pips" aria-hidden="true">
          <span
            v-for="(on, i) in chakraPips"
            :key="i"
            class="chakra__pip"
            :class="{ 'chakra__pip--on': on }"
          />
        </span>
        <span class="chakra__label" aria-hidden="true">
          {{ t('combat.chakraLabel') }} {{ player.chakra ?? 0 }}/{{ player.maxChakra ?? 3 }}
        </span>
      </div>

      <span v-if="player.block" :key="player.block" class="armor-chip" :title="t('combat.block', { n: player.block })">
        <AppIcon name="block" size="1rem" :stroke-width="2" />
        <span class="armor-chip__value">{{ player.block }}</span>
        {{ t('combat.blockLabel') }}
      </span>
    </div>

    <div v-if="player.statuses?.length" class="fighter__statuses">
      <StatusIcon v-for="(s, idx) in player.statuses" :key="`${s.key}-${idx}`" :status="s" />
    </div>

    <div v-if="player.ally" class="ally" data-testid="combat-ally">
      <span class="shape shape--hexagon ally__mark" aria-hidden="true" />
      <div class="min-w-0">
        <p class="ally__role">{{ t('combat.allyLabel') }}</p>
        <p class="ally__name">{{ player.ally.nameFr || player.ally.nameEn }}</p>
      </div>
      <p class="ally__meta">
        <strong>{{ player.ally.hp }}</strong>/{{ player.ally.maxHp }} {{ t('combat.hpLabel') }}
        · {{ t('combat.allyAttackStat', { n: player.ally.attack }) }}
        <span v-if="player.ally.taunt">· {{ t('combat.allyTaunt') }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.ally {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.75rem;
  padding: 0.6rem 0.75rem;
  background: var(--color-bg-card);
  animation: rise-in 360ms var(--ease-out-quint) both;
}

.ally__mark {
  font-size: 1.5rem;
  color: var(--color-wood-fill);
}

.ally__role {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-wood);
}

.ally__name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.15;
}

.ally__meta {
  margin-left: auto;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
}

.ally__meta strong {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--color-ink);
}
</style>
