<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CardDisplay from '../cards/CardDisplay.vue';
import BoosterPackVisual from './BoosterPackVisual.vue';
import { localizedName } from '../../utils/localeContent.js';

defineOptions({ name: 'BoosterOpening' });

const props = defineProps({
  cards: { type: Array, default: () => [] },
  active: { type: Boolean, default: false },
  /** Type acheté — même pack que l’aperçu boutique. */
  boosterType: { type: String, default: 'standard' },
  boosterName: { type: String, default: '' },
  element: { type: String, default: null },
  cardCount: { type: Number, default: 0 },
  showCollectionStatus: { type: Boolean, default: true },
  canRepurchase: { type: Boolean, default: false },
  repurchasing: { type: Boolean, default: false },
});

const emit = defineEmits(['done', 'repurchase']);

const { t, locale } = useI18n();

/** sealed | opening | hidden | revealed | done */
const phase = ref('sealed');
const index = ref(0);
const busy = ref(false);
const packVisible = ref(true);
const packOpen = ref(false);
const packLeaving = ref(false);
const stackVisible = ref(false);
const burstShow = ref(false);
const gone = ref([]);
const revealedSet = ref(new Set());

let openingToken = 0;
let reduceMotion = false;

const total = computed(() => props.cards.length);
const packCardCount = computed(() => props.cardCount || total.value || 5);

const currentEntry = computed(() => props.cards[index.value] || null);

const statusText = computed(() => {
  if (phase.value === 'sealed') return t('shop.tearHint');
  if (phase.value === 'opening') return t('shop.sealBroken');
  if (phase.value === 'hidden') {
    return t('shop.revealHint', { n: index.value + 1, total: total.value });
  }
  if (phase.value === 'revealed') {
    const entry = currentEntry.value;
    const rarity = entry?.rarity || 'common';
    if (rarity === 'mythic') return t('shop.revealMythic');
    if (rarity === 'legendary') return t('shop.revealLegendary');
    if (rarity === 'rare') return t('shop.revealRare');
    return t('shop.revealCommon', {
      n: index.value + 1,
      total: total.value,
      name: cardName(entry),
    });
  }
  if (phase.value === 'done') return t('shop.revealDone');
  return '';
});

const actionLabel = computed(() => {
  if (phase.value === 'sealed') return t('shop.tearAction');
  if (phase.value === 'hidden') return t('shop.revealCard');
  if (phase.value === 'done') return t('shop.closeResults');
  return t('shop.revealCard');
});

const nextLabel = computed(() => {
  if (index.value >= total.value - 1) return t('shop.seeResults');
  return t('shop.nextCard');
});

const showNewBadge = computed(
  () =>
    props.showCollectionStatus && phase.value === 'revealed' && Boolean(currentEntry.value?.isNew)
);

const showDupBadge = computed(
  () =>
    props.showCollectionStatus &&
    phase.value === 'revealed' &&
    currentEntry.value &&
    !currentEntry.value.isNew
);

const collectedCount = computed(() => {
  let n = revealedSet.value.size;
  if (phase.value === 'revealed' && !revealedSet.value.has(index.value)) n += 1;
  return Math.min(n, total.value);
});

const stageClickable = computed(
  () => !busy.value && (phase.value === 'hidden' || phase.value === 'revealed')
);

function cardName(entry) {
  if (!entry?.card) return '';
  return localizedName(entry.card, locale.value);
}

function wait(ms) {
  if (reduceMotion) return Promise.resolve();
  return new Promise(r => setTimeout(r, ms));
}

function resetCeremony() {
  openingToken += 1;
  phase.value = 'sealed';
  index.value = 0;
  busy.value = false;
  packVisible.value = true;
  packOpen.value = false;
  packLeaving.value = false;
  stackVisible.value = false;
  burstShow.value = false;
  gone.value = [];
  revealedSet.value = new Set();
}

async function openPack() {
  if (phase.value !== 'sealed' || busy.value) return;
  const token = ++openingToken;
  busy.value = true;
  phase.value = 'opening';
  packOpen.value = true;

  await wait(580);
  if (token !== openingToken) return;
  packLeaving.value = true;
  await wait(460);
  if (token !== openingToken) return;

  packVisible.value = false;
  stackVisible.value = true;
  phase.value = 'hidden';
  busy.value = false;
}

async function reveal() {
  if (phase.value !== 'hidden' || busy.value) return;
  busy.value = true;
  const next = new Set(revealedSet.value);
  next.add(index.value);
  revealedSet.value = next;
  phase.value = 'revealed';

  await wait(530);
  const rarity = props.cards[index.value]?.rarity;
  if (rarity === 'rare' || rarity === 'legendary' || rarity === 'mythic') {
    burstShow.value = false;
    await wait(20);
    burstShow.value = true;
  }
  busy.value = false;
}

async function next() {
  if (phase.value !== 'revealed' || busy.value) return;
  busy.value = true;
  gone.value = [...gone.value, index.value];
  await wait(420);
  index.value += 1;
  if (index.value >= props.cards.length) {
    phase.value = 'done';
    stackVisible.value = false;
    busy.value = false;
    return;
  }
  phase.value = 'hidden';
  busy.value = false;
}

/** Progressive click: flip → next → … → final results. */
function onStageActivate() {
  if (busy.value) return;
  if (phase.value === 'hidden') reveal();
  else if (phase.value === 'revealed') next();
}

function revealAll() {
  if (busy.value || !['hidden', 'revealed'].includes(phase.value)) return;
  revealedSet.value = new Set(props.cards.map((_, i) => i));
  phase.value = 'done';
  stackVisible.value = false;
}

function onAction() {
  if (phase.value === 'sealed') openPack();
  else if (phase.value === 'hidden') reveal();
  else if (phase.value === 'done') emit('done');
}

function cardFace(i) {
  return revealedSet.value.has(i) ? 'front' : 'back';
}

function isCurrent(i) {
  return i === index.value && (phase.value === 'hidden' || phase.value === 'revealed');
}

function isGone(i) {
  return gone.value.includes(i);
}

function isCollected(i) {
  return revealedSet.value.has(i) || (phase.value === 'revealed' && i === index.value);
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  if (props.active && props.cards.length) resetCeremony();
});

watch(
  () => [props.active, props.cards],
  () => {
    if (props.active && props.cards.length) resetCeremony();
  }
);

onBeforeUnmount(() => {
  openingToken += 1;
});
</script>

<template>
  <div class="booster-opening" data-testid="booster-opening" aria-live="polite">
    <section class="booster-opening__stage" :aria-label="t('shop.openingStage')">
      <div class="booster-opening__glow" aria-hidden="true" />
      <div
        class="booster-opening__burst"
        :class="{ 'booster-opening__burst--show': burstShow }"
        aria-hidden="true"
      />

      <BoosterPackVisual
        v-show="packVisible"
        class="booster-opening__pack-host"
        :type="boosterType"
        :element="element"
        :name="boosterName"
        :card-count="packCardCount"
        mode="ceremony"
        :open="packOpen"
        :leaving="packLeaving"
        :interactive="phase === 'sealed' && !busy"
        @open="openPack"
      />

      <div
        class="booster-opening__stack"
        :class="{
          'booster-opening__stack--visible': stackVisible,
          'booster-opening__stack--clickable': stageClickable,
        }"
        data-testid="booster-stack"
        @click="onStageActivate"
        @keydown.enter.prevent="onStageActivate"
        @keydown.space.prevent="onStageActivate"
      >
        <div
          v-for="(entry, i) in cards"
          :key="`${entry.collectionId || entry.card?.slug || i}-${i}`"
          class="booster-opening__stack-card"
          :class="{
            'booster-opening__stack-card--current': isCurrent(i),
            'booster-opening__stack-card--revealed': revealedSet.has(i),
            'booster-opening__stack-card--gone': isGone(i),
            [`booster-opening__stack-card--${entry.rarity}`]: revealedSet.has(i),
          }"
          :style="{ zIndex: cards.length - i }"
        >
          <CardDisplay :card="entry.card" :face="cardFace(i)" :compact="true" />
        </div>

        <button
          v-if="stageClickable"
          type="button"
          class="booster-opening__stage-hit"
          data-testid="booster-reveal-hit"
          :aria-label="phase === 'hidden' ? t('shop.revealCard') : nextLabel"
          @click.stop="onStageActivate"
        />
      </div>
    </section>

    <!-- Captions hors des cartes (espace clair au-dessous) -->
    <div class="booster-opening__captions" data-testid="booster-captions">
      <p v-if="showNewBadge" class="booster-opening__badge booster-opening__badge--new">
        {{ t('shop.newCard') }}
      </p>
      <p v-else-if="showDupBadge" class="booster-opening__badge booster-opening__badge--dup">
        {{ t('shop.duplicate', { name: cardName(currentEntry) }) }}
      </p>
      <p class="booster-opening__status" data-testid="booster-status">{{ statusText }}</p>
    </div>

    <div class="booster-opening__toolbar">
      <button
        type="button"
        class="btn-secondary"
        data-testid="booster-action"
        :disabled="busy || phase === 'revealed' || phase === 'opening' || repurchasing"
        @click="onAction"
      >
        {{ actionLabel }}
      </button>
      <button
        v-if="phase === 'hidden' || phase === 'revealed'"
        type="button"
        class="btn-secondary"
        data-testid="booster-reveal-all"
        :disabled="busy"
        @click="revealAll"
      >
        {{ t('shop.revealAll') }}
      </button>
      <button
        v-if="phase === 'revealed'"
        type="button"
        class="btn-secondary"
        data-testid="booster-next"
        :disabled="busy"
        @click="next"
      >
        {{ nextLabel }}
      </button>
      <button
        v-if="phase === 'done' && canRepurchase"
        type="button"
        class="btn-primary"
        data-testid="booster-repurchase"
        :disabled="repurchasing"
        @click="emit('repurchase')"
      >
        {{ t('shop.buyAnotherBooster') }}
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
          :key="`result-${entry.collectionId || entry.card?.slug || i}-${i}`"
          class="booster-opening__result-card"
        >
          <template v-if="isCollected(i)">
            <CardDisplay :card="entry.card" />
            <span
              v-if="showCollectionStatus"
              class="booster-opening__result-badge"
              :class="entry.isNew ? 'booster-opening__result-badge--new' : ''"
            >
              {{ entry.isNew ? t('shop.newCard') : t('shop.duplicateCard') }}
            </span>
          </template>
          <div v-else class="booster-opening__result-placeholder">
            <span>{{ i + 1 }}</span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.booster-opening {
  margin-top: 0.5rem;
}

.booster-opening__pack-host {
  position: relative;
  z-index: 3;
}

/* Même fond que la page — pas de panneau contrasté. */
.booster-opening__stage {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24rem;
  padding: 1rem 0 1.5rem;
  overflow: visible;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.booster-opening__glow {
  position: absolute;
  width: 18rem;
  height: 18rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-gold-fill) 8%, transparent);
  filter: blur(90px);
  pointer-events: none;
  opacity: 0.45;
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

.booster-opening__stack {
  position: relative;
  z-index: 2;
  width: min(13.5rem, 76vw);
  aspect-ratio: 2.5 / 3.5;
  margin: 0 auto;
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
}

.booster-opening__stack:not(.booster-opening__stack--visible) {
  position: absolute;
  inset: auto;
  pointer-events: none;
}

.booster-opening__stack--clickable {
  pointer-events: auto;
  cursor: pointer;
}

.booster-opening__stack-card {
  position: absolute;
  inset: 0;
  transition:
    transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.45s;
  filter: drop-shadow(0 18px 15px #0008);
  pointer-events: none;
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

.booster-opening__stage-hit {
  position: absolute;
  inset: 0;
  z-index: 8;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.booster-opening__captions {
  position: relative;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  min-height: 4.25rem;
  margin: 0.75rem 0 1.15rem;
  padding: 0.5rem 0.75rem 0;
  text-align: center;
}

.booster-opening__badge {
  margin: 0;
  padding: 0.35rem 0.8rem;
  border-radius: 0.2rem;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.booster-opening__badge--new {
  background: color-mix(in srgb, var(--color-leaf-fill) 22%, transparent);
  color: var(--color-leaf-fill);
  border: 1px solid color-mix(in srgb, var(--color-leaf-fill) 45%, transparent);
}

.booster-opening__badge--dup {
  background: color-mix(in srgb, var(--color-ink) 8%, transparent);
  color: var(--color-ink-muted);
  border: 1px solid var(--color-line);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
}

.booster-opening__status {
  margin: 0;
  max-width: 28rem;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  line-height: 1.4;
  color: color-mix(in srgb, var(--color-ink) 88%, var(--color-gold-fill));
}

.booster-opening__toolbar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  opacity: 0.72;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 0.75rem;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
}

.booster-opening__result-card {
  position: relative;
  min-width: 0;
  animation: booster-result-in 320ms var(--ease-out-quint) both;
}

.booster-opening__result-placeholder {
  display: grid;
  place-items: center;
  aspect-ratio: 2.5 / 3.5;
  border: 1px dashed var(--color-line-strong);
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--color-bg-soft) 65%, transparent);
  color: var(--color-ink-faint);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 900;
}

.booster-opening__result-badge {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-line-strong);
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-bg-card) 92%, transparent);
  color: var(--color-ink-muted);
  font-size: 0.625rem;
  font-weight: 800;
  pointer-events: none;
}

.booster-opening__result-badge--new {
  border-color: var(--color-leaf-fill);
  color: var(--color-leaf-fill);
}

@keyframes booster-result-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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
  .booster-opening__stage {
    min-height: 24rem;
  }

  .booster-opening__collection-grid {
    gap: 0.65rem;
  }
}

@media (min-width: 640px) {
  .booster-opening__collection-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .booster-opening__burst--show,
  .booster-opening__stack,
  .booster-opening__stack-card {
    animation: none !important;
    transition: none !important;
  }
}
</style>
