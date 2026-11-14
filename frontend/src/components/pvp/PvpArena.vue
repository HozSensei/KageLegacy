<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CombatHand from '../combat/CombatHand.vue'
import CombatLog from '../combat/CombatLog.vue'
import PlayerStatus from '../combat/PlayerStatus.vue'

defineOptions({ name: 'PvpArena' })

const props = defineProps({
  view: { type: Object, required: true },
  role: { type: String, required: true },
  logs: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  busy: { type: Boolean, default: false },
  peerOnline: { type: Boolean, default: false },
})

const emit = defineEmits([
  'select-card',
  'play-card',
  'end-turn',
  'discard-chakra',
  'forfeit',
  'dismiss-outcome',
])

const { t } = useI18n()

const self = computed(() => props.view?.fighters?.[props.role] || null)
const opponentSeat = computed(() => (props.role === 'host' ? 'guest' : 'host'))
const opponent = computed(() => props.view?.fighters?.[opponentSeat.value] || null)

const isOver = computed(() =>
  ['completed', 'forfeited'].includes(props.view?.status)
)

const canAct = computed(
  () =>
    props.view?.status === 'in_progress' &&
    props.view?.activeSeat === props.role &&
    !props.busy
)

const outcomeKey = computed(() => {
  if (!isOver.value) return null
  if (props.view.winnerSeat === props.role) return 'victory'
  if (props.view.status === 'forfeited') return 'forfeited'
  return 'defeat'
})
</script>

<template>
  <div class="arena" data-testid="pvp-arena">
    <div class="arena__bg" aria-hidden="true" />

    <header class="arena__top">
      <div class="arena__meta">
        <p class="arena__turn">
          {{ t('pvp.turn', { n: view.turn }) }}
          <span class="arena__phase">
            ·
            {{
              view.activeSeat === role
                ? t('pvp.yourTurn')
                : t('pvp.opponentTurn')
            }}
          </span>
        </p>
        <p class="arena__role" data-testid="pvp-role-badge">
          <span class="badge" :class="role === 'host' ? 'badge--host' : 'badge--guest'">
            {{ role === 'host' ? t('pvp.roleHost') : t('pvp.roleGuest') }}
          </span>
          <span class="peer" :class="{ 'peer--on': peerOnline }">
            {{ peerOnline ? t('pvp.peerOnline') : t('pvp.peerOffline') }}
          </span>
        </p>
      </div>
      <button
        type="button"
        class="btn-ghost text-xs"
        :disabled="busy || view.status !== 'in_progress'"
        @click="emit('forfeit')"
      >
        {{ t('pvp.forfeit') }}
      </button>
    </header>

    <div v-if="isOver" class="arena__outcome" data-testid="pvp-outcome">
      <p class="arena__outcome-title">{{ t(`pvp.outcome.${outcomeKey}`) }}</p>
      <button type="button" class="btn-primary text-sm mt-3" @click="emit('dismiss-outcome')">
        {{ t('pvp.backToQueue') }}
      </button>
    </div>

    <section class="arena__enemy">
      <p class="arena__label">{{ opponent?.name || t('pvp.opponent') }}</p>
      <PlayerStatus
        :player="{
          name: opponent?.name,
          hp: opponent?.hp,
          maxHp: opponent?.maxHp,
          block: opponent?.block,
          chakra: opponent?.chakra,
          maxChakra: opponent?.maxChakra,
          statuses: opponent?.statuses || [],
          hand: [],
          drawCount: opponent?.drawCount,
          discardCount: opponent?.discardCount,
        }"
      />
      <p class="arena__hand-hint">
        {{ t('pvp.hiddenHand', { n: opponent?.handCount ?? 0 }) }}
      </p>
    </section>

    <div class="arena__divider" aria-hidden="true" />

    <section class="arena__player">
      <p class="arena__label">{{ self?.name || t('pvp.you') }}</p>
      <PlayerStatus :player="self || {}" />
      <CombatLog class="arena__log" :logs="logs" />
    </section>

    <section class="arena__hand-wrap">
      <CombatHand
        :cards="self?.hand || []"
        :selected-id="selectedId"
        :disabled="busy || !canAct"
        :chakra="self?.chakra || 0"
        @select="emit('select-card', $event)"
        @play="emit('play-card', $event)"
      />

      <div class="arena__actions">
        <button
          type="button"
          class="btn-secondary text-xs"
          :disabled="busy || !canAct || !selectedId || self?.discardedForChakra"
          @click="emit('discard-chakra')"
        >
          {{ t('combat.discardForChakra') }}
        </button>
        <button
          type="button"
          class="btn-primary text-xs"
          :disabled="busy || !canAct || !selectedId"
          data-testid="pvp-play-card"
          @click="emit('play-card')"
        >
          {{ t('combat.playCard') }}
        </button>
        <button
          type="button"
          class="btn-primary text-xs"
          :disabled="busy || !canAct"
          data-testid="pvp-end-turn"
          @click="emit('end-turn')"
        >
          {{ t('combat.endTurn') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.arena {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 28rem;
  padding: 1rem 1rem 1.25rem;
  border: 1px solid color-mix(in oklab, var(--color-ink, #1a1520) 12%, transparent);
  background: color-mix(in oklab, var(--color-surface, #0f1419) 88%, #1a2830);
  overflow: hidden;
}
.arena__bg {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(180, 90, 40, 0.18), transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgba(40, 90, 120, 0.2), transparent 55%);
}
.arena__top,
.arena__enemy,
.arena__player,
.arena__hand-wrap,
.arena__outcome {
  position: relative;
  z-index: 1;
}
.arena__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.arena__turn {
  font-size: 0.85rem;
  color: var(--color-ink-muted, #9aa3ad);
}
.arena__role {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.35rem;
  font-size: 0.75rem;
}
.badge {
  padding: 0.15rem 0.5rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
}
.badge--host {
  background: color-mix(in oklab, #c45c26 35%, transparent);
  color: #f3d4c0;
}
.badge--guest {
  background: color-mix(in oklab, #2a6f8f 40%, transparent);
  color: #c5e4f2;
}
.peer {
  opacity: 0.7;
}
.peer--on {
  opacity: 1;
  color: #7dba6f;
}
.arena__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-muted, #9aa3ad);
  margin-bottom: 0.35rem;
}
.arena__hand-hint {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--color-ink-muted, #9aa3ad);
}
.arena__divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklab, #c45c26 50%, transparent),
    transparent
  );
}
.arena__log {
  margin-top: 0.5rem;
}
.arena__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.arena__outcome {
  text-align: center;
  padding: 1rem;
  background: color-mix(in oklab, #000 35%, transparent);
}
.arena__outcome-title {
  font-size: 1.25rem;
  font-weight: 600;
}
</style>
