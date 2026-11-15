<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'PerspectiveCardGrid' })

const props = defineProps({
  /** Tiles abstraites : { id, tone, shape, labelKey?, label?, nameFr?, nameEn?, accent?, pips? } */
  tiles: { type: Array, default: () => [] },
  /** Nombre max affiché (mobile réduit via CSS / prop). */
  count: { type: Number, default: 9 },
  /** Inclinaison : `hero` (fort) ou `soft` (mobile / pages secondaires). */
  intensity: {
    type: String,
    default: 'hero',
    validator: (v) => ['hero', 'soft'].includes(v),
  },
  /** Active la dérive lente (respecte prefers-reduced-motion en CSS). */
  motion: { type: Boolean, default: true },
})

const { t, te, locale } = useI18n()

const visible = computed(() => props.tiles.slice(0, props.count))

function tileLabel(tile) {
  if (tile.nameFr || tile.nameEn) {
    return (locale.value === 'en' ? tile.nameEn : tile.nameFr) || tile.nameFr || tile.nameEn
  }
  if (tile.label) return tile.label
  if (tile.labelKey && te(tile.labelKey)) return t(tile.labelKey)
  return ''
}

function tilePips(tile) {
  if (tile.pips) return tile.pips
  if (tile.accent) return rarityVisual(tile.accent).pips
  return 0
}
</script>

<template>
  <div
    class="perspective-stage"
    :class="[
      `perspective-stage--${intensity}`,
      { 'perspective-stage--motion': motion },
    ]"
    aria-hidden="true"
    data-testid="perspective-card-grid"
  >
    <div class="perspective-stage__plane">
      <ul class="perspective-grid">
        <li
          v-for="(tile, index) in visible"
          :key="tile.id || index"
          class="perspective-tile"
          :data-tone="tile.tone || 'neutral'"
          :style="{ '--i': index }"
        >
          <span
            class="perspective-tile__shape shape"
            :class="`shape--${tile.shape || 'square'}`"
          />
          <span class="perspective-tile__label">{{ tileLabel(tile) }}</span>
          <span v-if="tilePips(tile)" class="perspective-tile__pips">
            <span v-for="n in tilePips(tile)" :key="n" class="lozenge" />
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.perspective-stage {
  --persp: 920px;
  --rx: 14deg;
  --ry: -32deg;
  --rz: 6deg;
  position: relative;
  width: min(100%, 22rem);
  height: clamp(11rem, 28vw, 15.5rem);
  margin-inline: auto;
  perspective: var(--persp);
  perspective-origin: 42% 45%;
  transform-style: preserve-3d;
}

.perspective-stage--soft {
  --rx: 10deg;
  --ry: -18deg;
  --rz: 3deg;
}

.perspective-stage__plane {
  position: absolute;
  inset: 8% 0 0;
  transform-origin: 50% 60%;
  transform: rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)) translateZ(0);
  transform-style: preserve-3d;
}

.perspective-stage--motion .perspective-stage__plane {
  animation: perspective-drift 14s var(--ease-out-quint) infinite alternate;
}

.perspective-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.perspective-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  aspect-ratio: 3 / 4;
  min-height: 0;
  padding: 0.55rem 0.5rem 0.6rem;
  border-radius: var(--radius-lg);
  background: var(--tone-tint);
  color: var(--color-ink);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--tone-fill) 28%, transparent),
    0 10px 0 -4px color-mix(in srgb, var(--tone-fill) 35%, transparent);
  transform: translateZ(0);
  animation: perspective-tile-float 7.5s ease-in-out infinite alternate;
  animation-delay: calc(var(--i, 0) * 180ms);
}

.perspective-stage:not(.perspective-stage--motion) .perspective-tile {
  animation: none;
}

.perspective-tile__shape {
  font-size: 1.15rem;
  color: var(--tone-fill);
}

.perspective-tile__label {
  font-family: var(--font-display);
  font-size: 0.6875rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.15;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.perspective-tile__pips {
  display: inline-flex;
  gap: 0.15rem;
  font-size: 0.55rem;
  color: var(--tone-fill);
}

@keyframes perspective-drift {
  from {
    transform: rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)) translate3d(0, 0, 0);
  }
  to {
    transform: rotateX(calc(var(--rx) + 3deg)) rotateY(calc(var(--ry) + 8deg))
      rotateZ(calc(var(--rz) - 2deg)) translate3d(0, -0.45rem, 0.4rem);
  }
}

@keyframes perspective-tile-float {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-0.35rem);
  }
}

@media (max-width: 767px) {
  .perspective-stage {
    --rx: 8deg;
    --ry: -14deg;
    --rz: 2deg;
    width: min(100%, 16.5rem);
    height: 10.5rem;
  }

  .perspective-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .perspective-tile:nth-child(n + 7) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .perspective-stage--motion .perspective-stage__plane,
  .perspective-tile {
    animation: none !important;
  }
}
</style>
