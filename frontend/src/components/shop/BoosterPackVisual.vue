<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandMark from '../ui/BrandMark.vue'
import { elementTone } from '../../utils/cardVisuals'

defineOptions({ name: 'BoosterPackVisual' })

const props = defineProps({
  /** standard | path-* | elemental | premium | elite | ascendant */
  type: { type: String, default: 'standard' },
  /** Teinte le pack élémentaire selon l’élément choisi. */
  element: { type: String, default: null },
  /** Nom affiché sous la marque (sinon libellé du type). */
  name: { type: String, default: '' },
  cardCount: { type: Number, default: 5 },
  /** preview = boutique ; ceremony = scène d’ouverture */
  mode: { type: String, default: 'preview' },
  /** Pack déjà déchiré (clip + top piece). */
  open: { type: Boolean, default: false },
  /** Pack en train de quitter la scène. */
  leaving: { type: Boolean, default: false },
  /** Active le swipe / clic sur la bande. */
  interactive: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const { t } = useI18n()

const tearOffset = ref(0)
const tearFilter = ref(null)

let drag = null
let suppressClick = false

const PATH_TONES = {
  'path-taijutsu': 'vermilion',
  'path-ninjutsu': 'sky',
  'path-genjutsu': 'indigo',
  'path-medicine': 'leaf',
}

const tone = computed(() => {
  if (props.type === 'elemental' && props.element) return elementTone(props.element)
  if (props.type === 'premium' || props.type === 'elite' || props.type === 'ascendant') return 'gold'
  if (props.type === 'elemental') return 'sky'
  if (PATH_TONES[props.type]) return PATH_TONES[props.type]
  return 'indigo'
})

const typeLabel = computed(() => t(`shop.types.${props.type}`, props.type))
const displayName = computed(() => props.name || typeLabel.value)

function clearTearDrag() {
  drag = null
  tearOffset.value = 0
  tearFilter.value = null
}

function requestOpen() {
  if (!props.interactive || props.open || props.leaving) return
  emit('open')
}

function onTearPointerDown(e) {
  if (!props.interactive || props.open || e.button !== 0) return
  e.preventDefault()
  drag = { id: e.pointerId, x: e.clientX, dx: 0 }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onTearPointerMove(e) {
  if (!drag || e.pointerId !== drag.id || !props.interactive || props.open) return
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
  if (distance >= 90) requestOpen()
}

function onTearClick(e) {
  if (!props.interactive) return
  if (suppressClick) {
    suppressClick = false
    return
  }
  if (e.detail === 0) requestOpen()
}

function onTearKeydown(e) {
  if (!props.interactive) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    requestOpen()
  }
}
</script>

<template>
  <div
    class="booster-pack-visual"
    :class="[
      `booster-pack-visual--${type}`,
      `booster-pack-visual--${mode}`,
      {
        'booster-pack-visual--open': open,
        'booster-pack-visual--leaving': leaving,
      },
    ]"
    :data-tone="tone"
    :data-testid="`booster-pack-${type}`"
  >
    <div class="booster-pack-visual__zone" data-testid="booster-pack-zone">
      <div class="booster-pack-visual__pack">
        <div class="booster-pack-visual__foil">
          <span class="booster-pack-visual__crimp booster-pack-visual__crimp--top" />
          <span class="booster-pack-visual__crimp booster-pack-visual__crimp--bottom" />
          <div class="booster-pack-visual__inner">
            <p class="booster-pack-visual__kicker">{{ typeLabel }}</p>
            <BrandMark class="booster-pack-visual__logo" size="4.25rem" />
            <div class="booster-pack-visual__name">{{ t('app.name') }}</div>
            <div class="booster-pack-visual__sub">{{ displayName }}</div>
            <div class="booster-pack-visual__count">
              {{ t('shop.boosterPackCount', { n: cardCount }) }}
            </div>
          </div>
        </div>
      </div>

      <div class="booster-pack-visual__top-piece" aria-hidden="true">
        <div class="booster-pack-visual__top-crimp" />
        <div class="booster-pack-visual__top-metal" />
      </div>

      <div
        class="booster-pack-visual__tear"
        :role="interactive ? 'button' : undefined"
        :tabindex="interactive ? 0 : undefined"
        data-testid="booster-tear"
        :aria-label="interactive ? t('shop.tearAria') : undefined"
        :aria-hidden="interactive ? undefined : 'true'"
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
        <span class="booster-pack-visual__tear-label">{{ t('shop.tearLabel') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.booster-pack-visual {
  --pack-edge: #d3ae79;
  --pack-foil-0: #1c2836;
  --pack-foil-1: #445466;
  --pack-foil-2: #1b2734;
  --pack-foil-3: #111a25;
  --pack-foil-4: #43566b;
  --pack-foil-5: #101923;
  --pack-ink: #f4e2c5;
  --pack-muted: #d2ad7c;
  --pack-tear-0: #273b50;
  --pack-tear-1: #1b2a3b;
  --pack-tear-2: #101c29;
  width: 16.5rem;
  margin-inline: auto;
}

/* L'ouverture conserve une échelle proche des cartes de collection. */
.booster-pack-visual--ceremony {
  width: 13.5rem;
}

.booster-pack-visual--standard {
  --pack-edge: #c9b08a;
  --pack-foil-0: #1c2836;
  --pack-foil-1: #445466;
  --pack-foil-2: #1b2734;
  --pack-foil-3: #111a25;
  --pack-foil-4: #43566b;
  --pack-foil-5: #101923;
  --pack-tear-0: #273b50;
  --pack-tear-1: #1b2a3b;
  --pack-tear-2: #101c29;
}

.booster-pack-visual--elemental {
  --pack-edge: #9fd4d8;
  --pack-foil-0: #14343c;
  --pack-foil-1: #3f8596;
  --pack-foil-2: #1a4550;
  --pack-foil-3: #0e2a32;
  --pack-foil-4: #4aa0b0;
  --pack-foil-5: #0b2228;
  --pack-ink: #e8f7f8;
  --pack-muted: #9fd4d8;
  --pack-tear-0: #1f5560;
  --pack-tear-1: #163f48;
  --pack-tear-2: #0d2a30;
}

.booster-pack-visual--elemental[data-tone='vermilion'] {
  --pack-edge: #e8a090;
  --pack-foil-0: #3a1814;
  --pack-foil-1: #a04838;
  --pack-foil-2: #4a2018;
  --pack-foil-3: #2a100c;
  --pack-foil-4: #c06048;
  --pack-foil-5: #1a0c08;
  --pack-muted: #e8a090;
  --pack-tear-0: #6a3028;
  --pack-tear-1: #4a2018;
  --pack-tear-2: #2a100c;
}

.booster-pack-visual--elemental[data-tone='sky'] {
  --pack-edge: #9ec8e8;
  --pack-foil-0: #142838;
  --pack-foil-1: #3a7098;
  --pack-foil-2: #1a3850;
  --pack-foil-3: #0e2030;
  --pack-foil-4: #4a88b0;
  --pack-foil-5: #0a1824;
  --pack-muted: #9ec8e8;
  --pack-tear-0: #284868;
  --pack-tear-1: #1a3850;
  --pack-tear-2: #0e2030;
}

.booster-pack-visual--elemental[data-tone='gold'] {
  --pack-edge: #e8d090;
  --pack-foil-0: #383014;
  --pack-foil-1: #98803a;
  --pack-foil-2: #504818;
  --pack-foil-3: #30280e;
  --pack-foil-4: #b0984a;
  --pack-foil-5: #241c0a;
  --pack-muted: #e8d090;
  --pack-tear-0: #685828;
  --pack-tear-1: #504818;
  --pack-tear-2: #30280e;
}

.booster-pack-visual--elemental[data-tone='wood'] {
  --pack-edge: #c8b090;
  --pack-foil-0: #2c2418;
  --pack-foil-1: #6a5840;
  --pack-foil-2: #3c3020;
  --pack-foil-3: #201810;
  --pack-foil-4: #887058;
  --pack-foil-5: #181208;
  --pack-muted: #c8b090;
  --pack-tear-0: #4a3c28;
  --pack-tear-1: #3c3020;
  --pack-tear-2: #201810;
}

.booster-pack-visual--elemental[data-tone='leaf'] {
  --pack-edge: #a8d090;
  --pack-foil-0: #183420;
  --pack-foil-1: #488850;
  --pack-foil-2: #204828;
  --pack-foil-3: #102818;
  --pack-foil-4: #60a068;
  --pack-foil-5: #0c1c10;
  --pack-muted: #a8d090;
  --pack-tear-0: #285838;
  --pack-tear-1: #204828;
  --pack-tear-2: #102818;
}

.booster-pack-visual--path-taijutsu {
  --pack-edge: #e8a090;
  --pack-foil-0: #3a1814;
  --pack-foil-1: #a04838;
  --pack-foil-2: #4a2018;
  --pack-foil-3: #2a100c;
  --pack-foil-4: #c06048;
  --pack-foil-5: #1a0c08;
  --pack-ink: #f8e8e4;
  --pack-muted: #e8a090;
  --pack-tear-0: #6a3028;
  --pack-tear-1: #4a2018;
  --pack-tear-2: #2a100c;
}

.booster-pack-visual--path-ninjutsu {
  --pack-edge: #9ec8e8;
  --pack-foil-0: #142838;
  --pack-foil-1: #3a7098;
  --pack-foil-2: #1a3850;
  --pack-foil-3: #0e2030;
  --pack-foil-4: #4a88b0;
  --pack-foil-5: #0a1824;
  --pack-ink: #e8f2f8;
  --pack-muted: #9ec8e8;
  --pack-tear-0: #284868;
  --pack-tear-1: #1a3850;
  --pack-tear-2: #0e2030;
}

.booster-pack-visual--path-genjutsu {
  --pack-edge: #c4a8e0;
  --pack-foil-0: #241838;
  --pack-foil-1: #684898;
  --pack-foil-2: #382850;
  --pack-foil-3: #181028;
  --pack-foil-4: #8860b0;
  --pack-foil-5: #100c1c;
  --pack-ink: #f0e8f8;
  --pack-muted: #c4a8e0;
  --pack-tear-0: #483068;
  --pack-tear-1: #382850;
  --pack-tear-2: #181028;
}

.booster-pack-visual--path-medicine {
  --pack-edge: #a8d090;
  --pack-foil-0: #183420;
  --pack-foil-1: #488850;
  --pack-foil-2: #204828;
  --pack-foil-3: #102818;
  --pack-foil-4: #60a068;
  --pack-foil-5: #0c1c10;
  --pack-ink: #e8f8ec;
  --pack-muted: #a8d090;
  --pack-tear-0: #285838;
  --pack-tear-1: #204828;
  --pack-tear-2: #102818;
}

.booster-pack-visual--premium {
  --pack-edge: #e8c878;
  --pack-foil-0: #32240e;
  --pack-foil-1: #9a7834;
  --pack-foil-2: #4a3814;
  --pack-foil-3: #241808;
  --pack-foil-4: #b89040;
  --pack-foil-5: #181004;
  --pack-ink: #f8ecd0;
  --pack-muted: #e8c878;
  --pack-tear-0: #6a5020;
  --pack-tear-1: #4a3814;
  --pack-tear-2: #241808;
}

.booster-pack-visual--elite {
  --pack-edge: #f0d090;
  --pack-foil-0: #3a2810;
  --pack-foil-1: #b88838;
  --pack-foil-2: #5a4018;
  --pack-foil-3: #2c1c08;
  --pack-foil-4: #d0a048;
  --pack-foil-5: #1c1404;
  --pack-ink: #fff4d8;
  --pack-muted: #f0d090;
  --pack-tear-0: #7a5820;
  --pack-tear-1: #5a4018;
  --pack-tear-2: #2c1c08;
}

.booster-pack-visual--ascendant {
  --pack-edge: #f8e0a0;
  --pack-foil-0: #402810;
  --pack-foil-1: #c89840;
  --pack-foil-2: #684818;
  --pack-foil-3: #301c08;
  --pack-foil-4: #e0b050;
  --pack-foil-5: #201404;
  --pack-ink: #fff8e0;
  --pack-muted: #f8e0a0;
  --pack-tear-0: #8a6424;
  --pack-tear-1: #684818;
  --pack-tear-2: #301c08;
}

.booster-pack-visual__zone {
  position: relative;
  width: 100%;
  aspect-ratio: 16.5 / 25.3;
  perspective: 900px;
}

.booster-pack-visual--preview .booster-pack-visual__zone {
  transform: perspective(900px) rotateY(-6deg) rotateX(3deg);
  transition: transform var(--dur-base) var(--ease-out-quint);
  filter: drop-shadow(0 18px 28px color-mix(in srgb, var(--color-ink) 28%, transparent));
}

.booster-pack-visual--preview:hover .booster-pack-visual__zone {
  transform: perspective(900px) rotateY(-1deg) rotateX(1deg) translateY(-5px);
}

.booster-pack-visual__pack {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 22px 23px #000b);
}

.booster-pack-visual--preview .booster-pack-visual__pack {
  filter: none;
}

.booster-pack-visual__foil {
  position: absolute;
  inset: 0;
  border: 2px solid var(--pack-edge);
  border-radius: 7px;
  overflow: hidden;
  background: linear-gradient(
    110deg,
    var(--pack-foil-0) 0%,
    var(--pack-foil-1) 18%,
    var(--pack-foil-2) 29%,
    var(--pack-foil-3) 51%,
    var(--pack-foil-4) 79%,
    var(--pack-foil-5) 100%
  );
  box-shadow:
    inset 0 0 0 6px #090f18,
    inset 0 0 0 7px color-mix(in srgb, var(--pack-edge) 55%, transparent);
  transition: clip-path 0.15s;
}

.booster-pack-visual__foil::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(100deg, transparent 0 10px, #ffffff08 11px 12px),
    linear-gradient(115deg, transparent 18%, #ffffff27 34%, transparent 48%);
  mix-blend-mode: screen;
}

.booster-pack-visual__crimp {
  position: absolute;
  left: 0;
  right: 0;
  height: 1.5rem;
  z-index: 5;
  background: repeating-linear-gradient(90deg, #92795c 0 4px, #f5d5a0 5px 8px, #64533f 9px 12px);
  box-shadow: 0 2px 6px #0008;
}

.booster-pack-visual__crimp--top {
  top: 0;
}

.booster-pack-visual__crimp--bottom {
  bottom: 0;
}

.booster-pack-visual__inner {
  position: absolute;
  inset: 1.9rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--pack-edge) 40%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--pack-ink);
}

.booster-pack-visual__kicker {
  position: absolute;
  top: 0.85rem;
  left: 0.6rem;
  right: 0.6rem;
  margin: 0;
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--pack-muted);
}

.booster-pack-visual__logo {
  color: var(--pack-ink);
  filter: drop-shadow(0 0 20px color-mix(in srgb, var(--pack-edge) 35%, transparent));
}

.booster-pack-visual__name {
  margin: 1.25rem 0 0.35rem;
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.05;
}

.booster-pack-visual__sub {
  max-width: 90%;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 800;
  font-stretch: 84%;
  line-height: 1.15;
  letter-spacing: 0.02em;
  color: var(--pack-muted);
  text-wrap: balance;
}

.booster-pack-visual__count {
  margin-top: 1.4rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--pack-edge) 55%, transparent);
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.booster-pack-visual__top-piece {
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

.booster-pack-visual__top-crimp {
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

.booster-pack-visual__top-metal {
  position: absolute;
  top: 1.5rem;
  left: 0;
  right: 0;
  height: 2.625rem;
  background: linear-gradient(
    110deg,
    var(--pack-foil-0),
    var(--pack-foil-1) 18%,
    var(--pack-foil-2) 29%,
    var(--pack-foil-3) 51%,
    var(--pack-foil-4) 79%,
    var(--pack-foil-5)
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

.booster-pack-visual__tear {
  position: absolute;
  z-index: 14;
  left: 0;
  right: 0;
  top: 1.55rem;
  height: 2.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--pack-tear-0) 0%, var(--pack-tear-1) 50%, var(--pack-tear-2) 100%);
  border-top: 1px solid color-mix(in srgb, var(--pack-edge) 60%, transparent);
  border-bottom: 1px dashed color-mix(in srgb, var(--pack-edge) 60%, transparent);
  box-shadow:
    inset 0 2px 5px #0006,
    0 3px 6px #0005;
  user-select: none;
  transition: opacity 0.12s;
}

.booster-pack-visual--ceremony .booster-pack-visual__tear {
  cursor: grab;
  touch-action: none;
}

.booster-pack-visual--preview .booster-pack-visual__tear {
  pointer-events: none;
}

.booster-pack-visual--ceremony .booster-pack-visual__tear:active {
  cursor: grabbing;
}

.booster-pack-visual__tear-label {
  color: var(--pack-muted);
  font-size: 0.5625rem;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-shadow: 0 1px 2px #000;
}

.booster-pack-visual--open .booster-pack-visual__foil {
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

.booster-pack-visual--open .booster-pack-visual__top-piece {
  opacity: 1;
  animation: booster-pack-top-fly 0.75s cubic-bezier(0.2, 0.75, 0.25, 1) forwards;
}

.booster-pack-visual--open .booster-pack-visual__tear {
  opacity: 0;
  pointer-events: none;
}

.booster-pack-visual--open {
  pointer-events: none;
}

.booster-pack-visual--open.booster-pack-visual--leaving .booster-pack-visual__pack {
  opacity: 0;
  transform: translateY(105px) scale(0.94);
  transition:
    opacity 0.43s ease-in,
    transform 0.43s ease-in;
}

@keyframes booster-pack-top-fly {
  from {
    transform: translate(0, 0) rotate(0);
    opacity: 1;
  }
  to {
    transform: translate(155px, -175px) rotate(32deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .booster-pack-visual--preview .booster-pack-visual__zone,
  .booster-pack-visual--preview:hover .booster-pack-visual__zone {
    transform: none;
  }

  .booster-pack-visual--open .booster-pack-visual__top-piece,
  .booster-pack-visual--open.booster-pack-visual--leaving .booster-pack-visual__pack,
  .booster-pack-visual__foil,
  .booster-pack-visual__tear {
    animation: none !important;
    transition: none !important;
  }
}
</style>
