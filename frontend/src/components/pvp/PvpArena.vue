<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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

const isMyTurn = computed(() => props.view?.activeSeat === props.role)
const turnNumber = computed(() => String(props.view?.turn ?? 0).padStart(2, '0'))

const opponentPlayer = computed(() => ({
  name: opponent.value?.name || t('pvp.opponent'),
  hp: opponent.value?.hp,
  maxHp: opponent.value?.maxHp,
  block: opponent.value?.block,
  chakra: opponent.value?.chakra,
  maxChakra: opponent.value?.maxChakra,
  statuses: opponent.value?.statuses || [],
  hand: [],
  drawCount: opponent.value?.drawCount,
  discardCount: opponent.value?.discardCount,
}))

const selfPlayer = computed(() => ({
  ...(self.value || {}),
  name: self.value?.name || t('pvp.you'),
}))

/* Bandeau éphémère à chaque changement de main (affichage seul). */
const banner = ref(false)
let bannerTimer = null

watch(
  () => `${props.view?.turn}:${props.view?.activeSeat}`,
  (next, prev) => {
    if (!prev || next === prev || props.view?.status !== 'in_progress') return
    banner.value = true
    if (bannerTimer) clearTimeout(bannerTimer)
    bannerTimer = setTimeout(() => {
      banner.value = false
    }, 900)
  }
)

onBeforeUnmount(() => {
  if (bannerTimer) clearTimeout(bannerTimer)
})

const outcomeKey = computed(() => {
  if (!isOver.value) return null
  if (props.view.winnerSeat === props.role) return 'victory'
  if (props.view.status === 'forfeited') return 'forfeited'
  return 'defeat'
})
</script>

<template>
  <div class="arena arena--with-side" data-testid="pvp-arena">
    <header class="arena__top">
      <div class="pvp-top">
        <p class="arena__turn" :data-tone="isMyTurn ? 'indigo' : 'vermilion'">
          <span class="sr-only">{{ t('pvp.turn', { n: view.turn }) }}</span>
          <span class="arena__turn-label" aria-hidden="true">{{ t('combat.turnLabel') }}</span>
          <span :key="view.turn" class="arena__turn-number" aria-hidden="true">{{ turnNumber }}</span>
          <span class="arena__phase">
            <span class="lozenge" aria-hidden="true" />
            {{ isMyTurn ? t('pvp.yourTurn') : t('pvp.opponentTurn') }}
          </span>
        </p>
        <p class="pvp-top__role" data-testid="pvp-role-badge">
          <span class="badge badge--solid" :data-tone="role === 'host' ? 'vermilion' : 'sky'">
            {{ role === 'host' ? t('pvp.roleHost') : t('pvp.roleGuest') }}
          </span>
          <span class="peer" :class="{ 'peer--on': peerOnline }">
            <span class="dot" aria-hidden="true" />
            {{ peerOnline ? t('pvp.peerOnline') : t('pvp.peerOffline') }}
          </span>
        </p>
      </div>
      <button
        type="button"
        class="btn-danger btn-sm"
        :disabled="busy || view.status !== 'in_progress'"
        @click="emit('forfeit')"
      >
        {{ t('pvp.forfeit') }}
      </button>
    </header>

    <div
      v-if="isOver"
      class="arena__outcome pvp-outcome"
      :data-tone="outcomeKey === 'victory' ? 'leaf' : outcomeKey === 'defeat' ? 'vermilion' : 'ink'"
      data-testid="pvp-outcome"
    >
      <span class="pvp-outcome__shape" aria-hidden="true" />
      <p class="pvp-outcome__title">{{ t(`pvp.outcome.${outcomeKey}`) }}</p>
      <button type="button" class="btn-secondary mt-4" @click="emit('dismiss-outcome')">
        {{ t('pvp.backToQueue') }}
      </button>
    </div>

    <div class="arena__duel">
      <section class="arena__seat">
        <div class="pvp-seat">
          <PlayerStatus :player="opponentPlayer" tone="vermilion" :role-label="t('pvp.opponent')" />
          <p class="pvp-seat__hint">
            {{ t('pvp.hiddenHand', { n: opponent?.handCount ?? 0 }) }}
          </p>
        </div>
      </section>

      <span class="arena__vs" aria-hidden="true"><span>{{ t('common.vs') }}</span></span>

      <section class="arena__seat arena__seat--self">
        <PlayerStatus :player="selfPlayer" />
      </section>

      <Transition name="turn-banner">
        <p
          v-if="banner"
          class="arena__banner"
          :data-tone="isMyTurn ? 'indigo' : 'vermilion'"
          aria-hidden="true"
        >
          {{ isMyTurn ? t('pvp.yourTurn') : t('pvp.opponentTurn') }}
          <span class="arena__banner-sub">{{ t('pvp.turn', { n: view.turn }) }}</span>
        </p>
      </Transition>
    </div>

    <section class="arena__hand-wrap">
      <div class="arena__hand-head">
        <h3 class="t-kicker">{{ t('combat.handTitle') }} · {{ (self?.hand || []).length }}</h3>
        <p class="arena__hand-hint">{{ t('combat.handHint') }}</p>
      </div>

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
          class="btn-ghost"
          :disabled="busy || !canAct || !selectedId || self?.discardedForChakra"
          @click="emit('discard-chakra')"
        >
          {{ t('combat.discardForChakra') }}
        </button>
        <button
          type="button"
          class="btn-primary btn-lg"
          :disabled="busy || !canAct || !selectedId"
          data-testid="pvp-play-card"
          @click="emit('play-card')"
        >
          {{ t('combat.playCard') }}
        </button>
        <button
          type="button"
          class="btn-secondary btn-lg"
          :disabled="busy || !canAct"
          data-testid="pvp-end-turn"
          @click="emit('end-turn')"
        >
          {{ t('combat.endTurn') }}
        </button>
      </div>
    </section>

    <CombatLog class="arena__side" :logs="logs" />
  </div>
</template>

<style scoped>
.pvp-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1.5rem;
}

.pvp-top__role {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.2rem;
}

.peer {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.peer .dot {
  color: var(--color-line-strong);
}

.peer--on {
  color: var(--color-leaf);
}

.peer--on .dot {
  color: var(--color-leaf-fill);
}

.pvp-seat {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pvp-seat > :deep(.fighter) {
  flex: 1;
}

.pvp-seat__hint {
  padding: 0.5rem 1rem;
  background: var(--color-vermilion-tint);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink);
}

.pvp-outcome {
  position: relative;
  overflow: hidden;
  padding: 1.75rem 1.5rem;
  background: var(--tone-fill);
  color: var(--tone-on);
  animation: rise-in 480ms var(--ease-out-quint) both;
}

.pvp-outcome__shape {
  position: absolute;
  top: -3rem;
  right: -2rem;
  width: 10rem;
  height: 10rem;
  background: color-mix(in srgb, var(--tone-on) 14%, transparent);
  transform: rotate(45deg);
}

.pvp-outcome__title {
  position: relative;
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 1.8rem + 4vw, 4.5rem);
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  letter-spacing: -0.02em;
}

.pvp-outcome .btn-secondary {
  position: relative;
  background: #fffdf8;
  color: var(--color-ink);
}
</style>
