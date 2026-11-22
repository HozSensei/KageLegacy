<script setup>
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'MissionPathNode' });

defineProps({
  node: { type: Object, required: true },
  indexLabel: { type: [Number, String], required: true },
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  statusLabel: { type: String, required: true },
  shape: { type: String, default: 'square' },
  tone: { type: String, default: 'indigo' },
  bossTag: { type: String, default: '' },
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
});
</script>

<template>
  <li
    class="run-node"
    :class="[
      `run-node--${node.status}`,
      `run-node--${node.type}`,
      {
        'run-node--boss': node.boss,
        'run-node--mystery': node.type === 'mystery' && !node.revealed,
        'run-node--first': isFirst,
        'run-node--last': isLast,
      },
    ]"
    :data-tone="tone"
    :data-testid="`run-node-${node.id}`"
  >
    <div class="run-node__marker">
      <span class="run-node__index" :class="`run-node__index--${shape}`">
        <span>{{ indexLabel }}</span>
      </span>
    </div>
    <div class="run-node__body">
      <p class="run-node__title">
        {{ title }}
        <span
          v-if="node.boss && bossTag"
          class="badge badge--solid run-node__boss"
          data-tone="vermilion"
        >
          {{ bossTag }}
        </span>
      </p>
      <p v-if="hint" class="run-node__hint">{{ hint }}</p>
    </div>
    <span class="run-node__status">
      <AppIcon
        v-if="node.status === 'cleared'"
        name="check"
        size="0.95rem"
        :stroke-width="2.5"
      />
      <AppIcon v-else-if="node.status === 'locked'" name="lock" size="0.9rem" />
      {{ statusLabel }}
    </span>
  </li>
</template>

<style scoped>
.run-node {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  min-height: 4.5rem;
  padding: 0.5rem 1rem 0.5rem 0;
}

.run-node__marker {
  position: relative;
  display: grid;
  align-self: stretch;
  place-items: center;
  z-index: 1;
}

/*
 * Rail vertical par puce, chevauché entre voisins pour une ligne continue.
 * Couleur assez visible (pas --color-line trop pâle) pour éviter les « coupures »
 * sur mobile / entre franchi et route active.
 */
.run-node__marker::before {
  content: '';
  position: absolute;
  z-index: 0;
  /* Chevauche le padding du nœud (±0.5rem) pour coller au rail voisin. */
  top: -0.5rem;
  bottom: -0.5rem;
  left: 50%;
  width: 3px;
  background: color-mix(in srgb, var(--color-ink-faint) 70%, transparent);
  transform: translateX(-50%);
  pointer-events: none;
}

.run-node--first .run-node__marker::before {
  top: 50%;
}

.run-node--last .run-node__marker::before {
  bottom: 50%;
}

.run-node--cleared .run-node__marker::before {
  background: var(--color-leaf-fill);
}

/* Continuité du rail franchi jusqu’à la puce active. */
.run-node--available .run-node__marker::before {
  background: var(--color-leaf-fill);
}

.run-node--available:not(.run-node--last):not(.run-node--first) .run-node__marker::before {
  background: linear-gradient(
    to bottom,
    var(--color-leaf-fill) 0,
    var(--color-leaf-fill) 50%,
    color-mix(in srgb, var(--color-ink-faint) 70%, transparent) 50%,
    color-mix(in srgb, var(--color-ink-faint) 70%, transparent) 100%
  );
}

.run-node__index {
  position: relative;
  z-index: 1;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  background: var(--color-bg);
  box-shadow: inset 0 0 0 2px var(--color-line-strong);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-faint);
}

.run-node__index--circle {
  border-radius: 999px;
}

.run-node__index--diamond {
  width: 2.1rem;
  height: 2.1rem;
  transform: rotate(45deg);
}

.run-node__index--diamond > span {
  transform: rotate(-45deg);
}

.run-node__index--lozenge {
  width: 2.1rem;
  height: 2.1rem;
  transform: rotate(45deg);
}

.run-node__index--lozenge > span {
  transform: rotate(-45deg);
}

.run-node__index--hexagon {
  clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%);
}

/* Actif = puce pleine teinte uniquement (pas de fond de ligne, pas de halo). */
.run-node--available .run-node__index {
  background: var(--tone-fill);
  box-shadow: none;
  color: var(--tone-on);
}

.run-node--available .run-node__index--diamond,
.run-node--available .run-node__index--lozenge {
  transform: rotate(45deg) scale(1.08);
}

.run-node--cleared .run-node__index {
  background: var(--color-leaf-fill);
  box-shadow: none;
  color: var(--color-on-leaf);
}

.run-node--failed .run-node__index {
  background: var(--color-ink);
  box-shadow: none;
  color: var(--color-on-ink);
}

.run-node__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.1;
  color: var(--color-ink);
}

.run-node--locked .run-node__title {
  color: var(--color-ink-muted);
}

.run-node__hint {
  margin: 0.2rem 0 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.run-node__status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.run-node--available .run-node__status {
  color: var(--tone);
}

.run-node--cleared .run-node__status {
  color: var(--color-leaf);
}

.run-node--failed .run-node__status {
  color: var(--color-vermilion);
}

@media (max-width: 479px) {
  .run-node {
    grid-template-columns: 3.25rem minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  /* Le marqueur (et son rail) couvre toute la hauteur du nœud, y compris le statut. */
  .run-node__marker {
    grid-row: 1 / span 2;
  }

  .run-node__status {
    grid-column: 2;
    margin-top: -0.3rem;
  }
}
</style>
