<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from '../cards/CardDisplay.vue'
import BrandMark from '../ui/BrandMark.vue'
import { rarityVisual } from '../../utils/cardVisuals'
import { resolveCardArt } from '../../utils/cardArt'
import { localizedName } from '../../utils/localeContent.js'

defineOptions({ name: 'BoosterOpening' })

const props = defineProps({
  cards: { type: Array, default: () => [] },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const { t, locale } = useI18n()

/** sealed | opening | hidden | revealed | done */
const phase = ref('sealed')
const index = ref(0)
const busy = ref(false)
const packVisible = ref(true)
const packOpen = ref(false)
const packLeaving = ref(false)
const stackVisible = ref(false)
const burstShow = ref(false)
const tearOffset = ref(0)
const tearFilter = ref(null)
const gone = ref([])
const revealedSet = ref(new Set())

let openingToken = 0
let drag = null
let suppressClick = false
let reduceMotion = false

const total = computed(() => props.cards.length)

const statusText = computed(() => {
  if (phase.value === 'sealed') return t('shop.tearHint')
  if (phase.value === 'opening') return t('shop.sealBroken')
  if (phase.value === 'hidden') {
    return t('shop.revealHint', { n: index.value + 1, total: total.value })
  }
  if (phase.value === 'revealed') {
    const entry = props.cards[index.value]
    const rarity = entry?.rarity || 'common'
    if (rarity === 'mythic') return t('shop.revealMythic')
    if (rarity === 'legendary') return t('shop.revealLegendary')
    if (rarity === 'rare') return t('shop.revealRare')
    return t('shop.revealCommon', {
      n: index.value + 1,
      total: total.value,
      name: cardName(entry),
    })
  }
  if (phase.value === 'done') return t('shop.revealDone')
  return ''
})

const actionLabel = computed(() => {
  if (phase.value === 'sealed') return t('shop.tearAction')
  if (phase.value === 'hidden') return t('shop.revealCard')
  if (phase.value === 'done') return t('shop.revealDone')
  return t('shop.revealCard')
})

const nextLabel = computed(() => {
  if (index.value >= total.value - 1) return t('shop.seeResults')
  return t('shop.nextCard')
})

const collectedCount = computed(() => {
  let n = revealedSet.value.size
  if (phase.value === 'revealed' && !revealedSet.value.has(index.value)) n += 1
  return Math.min(n, total.value)
})

function cardName(entry) {
  if (!entry?.card) return ''
  return localizedName(entry.card, locale.value)
}

function miniArt(entry) {
  return resolveCardArt(entry?.card)
}

function wait(ms) {
  if (reduceMotion) return Promise.resolve()
  return new Promise((r) => setTimeout(r, ms))
}

function resetCeremony() {
  openingToken += 1
  clearTearDrag()
  phase.value = 'sealed'
  index.value = 0
  busy.value = false
  packVisible.value = true
  packOpen.value = false
  packLeaving.value = false
  stackVisible.value = false
  burstShow.value = false
  tearOffset.value = 0
  tearFilter.value = null
  gone.value = []
  revealedSet.value = new Set()
}

async function openPack() {
  if (phase.value !== 'sealed' || busy.value) return
  const token = ++openingToken
  busy.value = true
  phase.value = 'opening'
  packOpen.value = true

  await wait(580)
  if (token !== openingToken) return
  packLeaving.value = true
  await wait(460)
  if (token !== openingToken) return

  packVisible.value = false
  stackVisible.value = true
  phase.value = 'hidden'
  busy.value = false
}

async function reveal() {
  if (phase.value !== 'hidden' || busy.value) return
  busy.value = true
  const next = new Set(revealedSet.value)
  next.add(index.value)
  revealedSet.value = next
  phase.value = 'revealed'

  await wait(530)
  const rarity = props.cards[index.value]?.rarity
  if (rarity === 'rare' || rarity === 'legendary' || rarity === 'mythic') {
    burstShow.value = false
    await wait(20)
    burstShow.value = true
  }
  busy.value = false
}

async function next() {
  if (phase.value !== 'revealed' || busy.value) return
  busy.value = true
  gone.value = [...gone.value, index.value]
  await wait(420)
  index.value += 1
  if (index.value >= props.cards.length) {
    phase.value = 'done'
    stackVisible.value = false
    busy.value = false
    emit('done')
    return
  }
  phase.value = 'hidden'
  busy.value = false
}

function onAction() {
  if (phase.value === 'sealed') openPack()
  else if (phase.value === 'hidden') reveal()
}

function onStackActivate() {
  if (phase.value === 'hidden') reveal()
}

function clearTearDrag() {
  drag = null
  tearOffset.value = 0
  tearFilter.value = null
}

function onTearPointerDown(e) {
  if (phase.value !== 'sealed' || e.button !== 0) return
  e.preventDefault()
  drag = { id: e.pointerId, x: e.clientX, dx: 0 }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onTearPointerMove(e) {
  if (!drag || e.pointerId !== drag.id || phase.value !== 'sealed') return
  drag.dx = Math.max(0, e.clientX - drag.x)
  const progress = Math.min(drag.dx / 115, 1)
  tearOffset.value = Math.min(drag.dx, 115) * 0.48
  tearFilter.value = `brightness(${1 + progress * 0.35})`
}

function onTearPointerUp(e) {
  if (!drag || e.pointerId !== drag.id) return
  const distance = Math.max(drag.dx, e.clientX - drag.x)
  suppressClick = true
  try {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
  clearTearDrag()
  if (distance >= 90) openPack()
}

function onTearClick(e) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  if (e.detail === 0) openPack()
}

function onTearKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openPack()
  }
}

function cardFace(i) {
  return revealedSet.value.has(i) ? 'front' : 'back'
}

function isCurrent(i) {
  return i === index.value && (phase.value === 'hidden' || phase.value === 'revealed')
}

function isGone(i) {
  return gone.value.includes(i)
}

function isCollected(i) {
  return revealedSet.value.has(i) || (phase.value === 'revealed' && i === index.value)
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  if (props.active && props.cards.length) resetCeremony()
})

watch(
  () => [props.active, props.cards],
  () => {
    if (props.active && props.cards.length) resetCeremony()
  },
)

onBeforeUnmount(() => {
  openingToken += 1
})
</script>

<template>
  <div class="booster-opening" data-testid="booster-opening" aria-live="polite">
    <section class="booster-opening__demo" :aria-label="t('shop.openingStage')">
      <div class="booster-opening__glow" aria-hidden="true" />
      <div
        class="booster-opening__burst"
        :class="{ 'booster-opening__burst--show': burstShow }"
        aria-hidden="true"
      />

      <div
        v-show="packVisible"
        class="booster-opening__pack-zone"
        :class="{
          'booster-opening__pack-zone--open': packOpen,
          'booster-opening__pack-zone--leaving': packLeaving,
        }"
        data-testid="booster-pack-zone"
      >
        <div class="booster-opening__pack">
          <div class="booster-opening__foil">
            <span class="booster-opening__crimp booster-opening__crimp--top" />
            <span class="booster-opening__crimp booster-opening__crimp--bottom" />
            <div class="booster-opening__pack-inner">
              <BrandMark class="booster-opening__pack-logo" size="4.5rem" />
              <div class="booster-opening__pack-name">{{ t('app.name') }}</div>
              <div class="booster-opening__pack-sub">{{ t('cards.backSubtitle') }}</div>
              <div class="booster-opening__pack-count">
                {{ t('shop.boosterPackCount', { n: total }) }}
              </div>
            </div>
          </div>
        </div>

        <div class="booster-opening__top-piece" aria-hidden="true">
          <div class="booster-opening__top-crimp" />
          <div class="booster-opening__top-metal" />
        </div>

        <div
          class="booster-opening__tear"
          role="button"
          tabindex="0"
          data-testid="booster-tear"
          :aria-label="t('shop.tearAria')"
          :style="{
            transform: tearOffset ? `translateX(${tearOffset}px)` : undefined,
            filter: tearFilter || undefined,
          }"
          @pointerdown="onTearPointerDown"
          @pointermove="onTearPointerMove"
          @pointerup="onTearPointerUp"
          @pointercancel="clearTearDrag"
          @click="onTearClick"
          @keydown="onTearKeydown"
        >
          <span class="booster-opening__tear-label">{{ t('shop.tearLabel') }}</span>
        </div>
      </div>

      <div
        class="booster-opening__stack"
        :class="{ 'booster-opening__stack--visible': stackVisible }"
        data-testid="booster-stack"
      >
        <div
          v-for="(entry, i) in cards"
          :key="`${entry.collectionId || entry.card?.slug || i}-${i}`"
          class="booster-opening__stack-card"
          :class="{
            'booster-opening__stack-card--current': isCurrent(i),
            'booster-opening__stack-card--revealed': revealedSet.has(i),
            'booster-opening__stack-card--gone': isGone(i),
            [`booster-opening__stack-card--${entry.rarity}`]: true,
          }"
          :style="{ zIndex: cards.length - i }"
          :data-tone="rarityVisual(entry.rarity).tone"
        >
          <button
            v-if="isCurrent(i) && phase === 'hidden'"
            type="button"
            class="booster-opening__reveal-hit"
            data-testid="booster-reveal-hit"
            :aria-label="t('shop.revealCard')"
            @click="onStackActivate"
          />
          <CardDisplay :card="entry.card" :face="cardFace(i)" :compact="true" />
          <p
            v-if="revealedSet.has(i) && isCurrent(i)"
            class="booster-opening__badge"
            :class="entry.isNew ? 'booster-opening__badge--new' : 'booster-opening__badge--dup'"
          >
            {{ entry.isNew ? t('shop.newCard') : t('shop.duplicate', { name: cardName(entry) }) }}
          </p>
        </div>
      </div>

      <p class="booster-opening__status" data-testid="booster-status">{{ statusText }}</p>
    </section>

    <div class="booster-opening__toolbar">
      <button
        type="button"
        class="btn-primary"
        data-testid="booster-action"
        :disabled="busy || phase === 'revealed' || phase === 'opening' || phase === 'done'"
        @click="onAction"
      >
        {{ actionLabel }}
      </button>
      <button
        type="button"
        class="btn-secondary"
        data-testid="booster-next"
        :disabled="busy || phase !== 'revealed'"
        @click="next"
      >
        {{ nextLabel }}
      </button>
    </div>

    <section class="booster-opening__collection" :aria-label="t('shop.obtainedTitle')">
      <h3 class="booster-opening__collection-title">
        {{ t('shop.obtainedTitle') }}
        <span>{{ collectedCount }} / {{ total }}</span>
      </h3>
      <ul class="booster-opening__collection-grid">
        <li
          v-for="(entry, i) in cards"
          :key="`mini-${entry.collectionId || i}`"
          class="booster-opening__mini"
          :class="{ 'booster-opening__mini--empty': !isCollected(i) }"
          :data-tone="isCollected(i) ? rarityVisual(entry.rarity).tone : undefined"
        >
          <template v-if="isCollected(i)">
            <img
              v-if="miniArt(entry)"
              class="booster-opening__mini-art"
              :src="miniArt(entry)"
              :alt="cardName(entry)"
              loading="lazy"
            />
            <span class="booster-opening__mini-name">{{ cardName(entry) }}</span>
            <span class="booster-opening__mini-sub">
              {{ '◆'.repeat(rarityVisual(entry.rarity).pips) }} ·
              {{ t(`cards.rarities.${entry.rarity}`) }}
            </span>
          </template>
          <span v-else>{{ i + 1 }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.booster-opening {
  --pack-edge: #d3ae79;
  margin-top: 0.5rem;
}

.booster-opening__demo {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36rem;
  overflow: hidden;
  margin: 0 0 1rem;
  border: 1px solid color-mix(in srgb, var(--color-line-strong) 70%, transparent);
  border-radius: 1rem;
  background:
    radial-gradient(
      ellipse at center,
      color-mix(in srgb, var(--color-indigo-soft) 28%, transparent),
      transparent 64%
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 70px,
      color-mix(in srgb, var(--color-on-ink) 4%, transparent) 71px 72px
    ),
    radial-gradient(
      ellipse at 50% 32%,
      color-mix(in srgb, var(--color-indigo) 35%, var(--color-bg)) 0%,
      var(--color-bg) 52%,
      color-mix(in srgb, var(--color-ink) 88%, black) 100%
    );
}

.booster-opening__demo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at center,
    transparent 25%,
    color-mix(in srgb, var(--color-ink) 55%, transparent) 100%
  );
  pointer-events: none;
}

.booster-opening__glow {
  position: absolute;
  width: 28rem;
  height: 28rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-gold-fill) 18%, transparent);
  filter: blur(80px);
  pointer-events: none;
}

.booster-opening__burst {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  background: repeating-conic-gradient(from 0deg, #f6d48e22 0deg 2deg, transparent 3deg 18deg);
  mask-image: radial-gradient(circle, transparent 0 17%, black 38%, transparent 70%);
}

.booster-opening__burst--show {
  animation: booster-burst 0.95s ease-out;
}

.booster-opening__pack-zone {
  position: relative;
  z-index: 3;
  width: 16.5rem;
  height: 25.3rem;
  perspective: 900px;
}

.booster-opening__pack {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 22px 23px #000b);
}

.booster-opening__foil {
  position: absolute;
  inset: 0;
  border: 2px solid var(--pack-edge);
  border-radius: 7px;
  overflow: hidden;
  background: linear-gradient(
    110deg,
    #1c2836 0%,
    #445466 18%,
    #1b2734 29%,
    #111a25 51%,
    #43566b 79%,
    #101923 100%
  );
  box-shadow:
    inset 0 0 0 6px #090f18,
    inset 0 0 0 7px #cba7788c;
  transition: clip-path 0.15s;
}

.booster-opening__foil::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(100deg, transparent 0 10px, #ffffff08 11px 12px),
    linear-gradient(115deg, transparent 18%, #ffffff27 34%, transparent 48%);
  mix-blend-mode: screen;
}

.booster-opening__crimp {
  position: absolute;
  left: 0;
  right: 0;
  height: 1.5rem;
  z-index: 5;
  background: repeating-linear-gradient(90deg, #92795c 0 4px, #f5d5a0 5px 8px, #64533f 9px 12px);
  box-shadow: 0 2px 6px #0008;
}

.booster-opening__crimp--top {
  top: 0;
}

.booster-opening__crimp--bottom {
  bottom: 0;
}

.booster-opening__pack-inner {
  position: absolute;
  inset: 1.9rem 0.8rem;
  border: 1px solid #e7c89d66;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #f4e2c5;
}

.booster-opening__pack-logo {
  color: #f4e2c5;
  filter: drop-shadow(0 0 20px #ffd48b55);
}

.booster-opening__pack-name {
  margin: 1.4rem 0 0.4rem;
  font-family: var(--font-display);
  font-size: 1.55rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.05;
}

.booster-opening__pack-sub {
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.26em;
  color: #d2ad7c;
}

.booster-opening__pack-count {
  margin-top: 1.7rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid #c7a77b8c;
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.booster-opening__top-piece {
  position: absolute;
  z-index: 9;
  top: 0;
  left: 0;
  right: 0;
  height: 4.125rem;
  pointer-events: none;
  opacity: 0;
  filter: drop-shadow(0 3px 2px #0007);
  transform-origin: 20% 50%;
}

.booster-opening__top-crimp {
  height: 1.5rem;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: repeating-linear-gradient(90deg, #92795c 0 4px, #f5d5a0 5px 8px, #64533f 9px 12px);
  border: 2px solid var(--pack-edge);
  border-bottom: 0;
  border-radius: 7px 7px 0 0;
}

.booster-opening__top-metal {
  position: absolute;
  top: 1.5rem;
  left: 0;
  right: 0;
  height: 2.625rem;
  background: linear-gradient(
    110deg,
    #1c2836,
    #445466 18%,
    #1b2734 29%,
    #111a25 51%,
    #43566b 79%,
    #101923
  );
  border-left: 2px solid var(--pack-edge);
  border-right: 2px solid var(--pack-edge);
  clip-path: polygon(
    0 0,
    100% 0,
    100% 89%,
    95% 96%,
    89% 87%,
    83% 100%,
    76% 88%,
    69% 98%,
    60% 87%,
    52% 99%,
    44% 89%,
    35% 99%,
    27% 87%,
    19% 98%,
    11% 89%,
    4% 99%,
    0 89%
  );
}

.booster-opening__tear {
  position: absolute;
  z-index: 14;
  left: 0;
  right: 0;
  top: 1.55rem;
  height: 2.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #273b50 0%, #1b2a3b 50%, #101c29 100%);
  border-top: 1px solid #d6b17d99;
  border-bottom: 1px dashed #d6b17d99;
  box-shadow:
    inset 0 2px 5px #0006,
    0 3px 6px #0005;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: opacity 0.12s;
}

.booster-opening__tear:active {
  cursor: grabbing;
}

.booster-opening__tear-label {
  color: #e9c38b;
  font-size: 0.5625rem;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-shadow: 0 1px 2px #000;
}

.booster-opening__pack-zone--open .booster-opening__foil {
  clip-path: polygon(
    0 16.1%,
    4% 16.4%,
    11% 15.3%,
    19% 16.3%,
    27% 15.5%,
    35% 16.2%,
    44% 15.3%,
    52% 16.1%,
    60% 15.5%,
    69% 16.3%,
    76% 15.4%,
    83% 16.2%,
    89% 15.5%,
    95% 16.2%,
    100% 15.5%,
    100% 100%,
    0 100%
  );
}

.booster-opening__pack-zone--open .booster-opening__top-piece {
  opacity: 1;
  animation: booster-top-fly 0.75s cubic-bezier(0.2, 0.75, 0.25, 1) forwards;
}

.booster-opening__pack-zone--open .booster-opening__tear {
  opacity: 0;
  pointer-events: none;
}

.booster-opening__pack-zone--open {
  pointer-events: none;
}

.booster-opening__pack-zone--open.booster-opening__pack-zone--leaving .booster-opening__pack {
  opacity: 0;
  transform: translateY(105px) scale(0.94);
  transition:
    opacity 0.43s ease-in,
    transform 0.43s ease-in;
}

.booster-opening__stack {
  position: absolute;
  z-index: 2;
  width: min(18.5rem, 86vw);
  aspect-ratio: 2.5 / 3.5;
  opacity: 0;
  transform: translateY(100px) scale(0.82);
  pointer-events: none;
  transition:
    opacity 0.7s,
    transform 0.8s;
}

.booster-opening__stack--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.booster-opening__stack-card {
  position: absolute;
  inset: 0;
  transition:
    transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.45s;
  filter: drop-shadow(0 18px 15px #0008);
}

.booster-opening__stack-card:nth-child(1) {
  transform: translate(-10px, 7px) rotate(-4deg);
}

.booster-opening__stack-card:nth-child(2) {
  transform: translate(8px, 4px) rotate(3deg);
}

.booster-opening__stack-card:nth-child(3) {
  transform: translate(-4px, -1px) rotate(-2deg);
}

.booster-opening__stack-card:nth-child(4) {
  transform: translate(5px, -5px) rotate(2deg);
}

.booster-opening__stack-card:nth-child(5) {
  transform: translate(0, -9px);
}

.booster-opening__stack-card--current {
  transform: translate(0, -9px) scale(1.015);
}

.booster-opening__stack-card--gone {
  transform: translate(390px, -65px) rotate(21deg) scale(0.8);
  opacity: 0;
  pointer-events: none;
}

.booster-opening__stack-card--revealed.booster-opening__stack-card--rare {
  filter: drop-shadow(0 0 11px #7ecaff55) drop-shadow(0 20px 15px #0008);
}

.booster-opening__stack-card--revealed.booster-opening__stack-card--legendary,
.booster-opening__stack-card--revealed.booster-opening__stack-card--mythic {
  filter: drop-shadow(0 0 18px #f4c76b88) drop-shadow(0 20px 15px #0008);
}

.booster-opening__reveal-hit {
  position: absolute;
  inset: 0;
  z-index: 5;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.booster-opening__badge {
  position: absolute;
  z-index: 6;
  left: 50%;
  bottom: -1.6rem;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.25rem 0.55rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-ink) 78%, transparent);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.booster-opening__badge--new {
  color: var(--color-leaf-fill);
}

.booster-opening__badge--dup {
  color: color-mix(in srgb, var(--color-on-ink) 75%, transparent);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
}

.booster-opening__status {
  position: absolute;
  z-index: 6;
  bottom: 1.1rem;
  left: 1rem;
  right: 1rem;
  margin: 0;
  text-align: center;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  color: color-mix(in srgb, var(--color-on-ink) 88%, var(--color-gold-fill));
  pointer-events: none;
  text-shadow: 0 1px 8px color-mix(in srgb, var(--color-ink) 55%, transparent);
}

.booster-opening__toolbar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.booster-opening__collection {
  margin-top: 1.75rem;
}

.booster-opening__collection-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.85rem;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-ink);
}

.booster-opening__collection-title span {
  color: var(--color-wood);
  font-variant-numeric: tabular-nums;
}

.booster-opening__collection-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.booster-opening__mini {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 8.5rem;
  border: 1px solid var(--color-line-strong);
  border-radius: 0.45rem;
  background: linear-gradient(145deg, var(--color-bg-card), var(--color-bg-soft));
  padding: 0.45rem;
  overflow: hidden;
}

.booster-opening__mini--empty {
  display: grid;
  place-items: center;
  color: var(--color-ink-faint);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 900;
}

.booster-opening__mini-art {
  width: 100%;
  aspect-ratio: 1.2;
  object-fit: cover;
  border-radius: 0.2rem;
}

.booster-opening__mini-name {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-ink);
}

.booster-opening__mini-sub {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
}

@keyframes booster-top-fly {
  from {
    transform: translate(0, 0) rotate(0);
    opacity: 1;
  }
  to {
    transform: translate(155px, -175px) rotate(32deg);
    opacity: 0;
  }
}

@keyframes booster-burst {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(0);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.5) rotate(18deg);
  }
}

@media (max-width: 650px) {
  .booster-opening__demo {
    min-height: 32rem;
  }

  .booster-opening__collection-grid {
    gap: 0.35rem;
  }

  .booster-opening__mini {
    min-height: 5.5rem;
    padding: 0.25rem;
  }

  .booster-opening__mini-name {
    font-size: 0.5625rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .booster-opening__pack-zone--open .booster-opening__top-piece,
  .booster-opening__burst--show,
  .booster-opening__stack,
  .booster-opening__stack-card,
  .booster-opening__pack-zone--open.booster-opening__pack-zone--leaving .booster-opening__pack,
  .booster-opening__foil,
  .booster-opening__tear {
    animation: none !important;
    transition: none !important;
  }
}
</style>
