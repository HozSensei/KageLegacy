<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { talentBranchTone } from '../../utils/talentVisuals';

defineOptions({ name: 'TalentTreeCanvas' });

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  nodeRanks: { type: Object, default: () => ({}) },
  pendingRanks: { type: Object, default: () => ({}) },
  branchPoints: { type: Object, default: () => ({}) },
  pointsAvailable: { type: Number, default: 0 },
  actionLoading: { type: Boolean, default: false },
  selectedNodeId: { type: String, default: null },
  isUnlockable: { type: Function, default: () => false },
  locale: { type: String, default: 'fr' },
});

const emit = defineEmits(['select', 'add', 'remove']);
const { t } = useI18n();
const BRANCHES = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

const pillars = computed(() =>
  BRANCHES.map(branch => ({
    branch,
    points: Number(props.branchPoints[branch]) || 0,
    tiers: [1, 2, 3, 4, 5, 6]
      .map(tier => props.nodes.filter(node => node.branch === branch && node.tier === tier))
      .filter(nodes => nodes.length),
  })).filter(pillar => pillar.tiers.length)
);

function rankOf(node) {
  return Number(props.nodeRanks[node.nodeId]) || 0;
}

function nodeName(node) {
  return props.locale === 'en' ? node.nameEn : node.nameFr;
}

function nodeDescription(node) {
  return props.locale === 'en' ? node.descriptionEn : node.descriptionFr;
}

function rankLabel(node) {
  return `${rankOf(node)}/${node.maxRank}`;
}

function tierRequirement(nodes) {
  return Number(nodes[0]?.requiredBranchPoints) || 0;
}

function tierLocked(nodes, branch) {
  return (Number(props.branchPoints[branch]) || 0) < tierRequirement(nodes);
}

function canIncrease(node) {
  return !props.actionLoading && props.pointsAvailable > 0 && props.isUnlockable(node);
}

function canDecrease(node) {
  return !props.actionLoading && (Number(props.pendingRanks[node.nodeId]) || 0) > 0;
}

function nodeClass(node) {
  const rank = rankOf(node);
  return [
    'talent-node',
    rank > 0 && 'is-invested',
    rank >= node.maxRank && 'is-complete',
    props.isUnlockable(node) && 'is-available',
    props.selectedNodeId === node.nodeId && 'is-selected',
  ];
}
</script>

<template>
  <div class="talent-pillars" data-testid="talent-canvas">
    <section
      v-for="pillar in pillars"
      :key="pillar.branch"
      class="talent-pillar"
      :data-tone="talentBranchTone(pillar.branch)"
    >
      <header class="talent-pillar__header">
        <span class="talent-pillar__sigil" aria-hidden="true"><i /></span>
        <div>
          <h2>{{ t(`talents.branches.${pillar.branch}`) }}</h2>
          <p>{{ t('talents.branchPoints', { count: pillar.points }) }}</p>
        </div>
      </header>

      <div class="talent-pillar__tiers">
        <section
          v-for="(tierNodes, tierIndex) in pillar.tiers"
          :key="tierNodes[0]?.nodeId"
          class="talent-tier"
          :class="{ 'is-locked': tierLocked(tierNodes, pillar.branch) }"
        >
          <div class="talent-tier__gate">
            <span>{{ t('talents.tier', { tier: tierIndex + 1 }) }}</span>
            <span v-if="tierIndex > 0">
              {{ t('talents.tierRequirement', { count: tierRequirement(tierNodes) }) }}
            </span>
          </div>

          <div class="talent-tier__nodes">
            <article
              v-for="node in tierNodes"
              :key="node.nodeId"
              :class="nodeClass(node)"
              :data-testid="`talent-node-${node.nodeId}`"
              tabindex="0"
              @click="emit('select', node.nodeId)"
              @keydown.enter="emit('select', node.nodeId)"
            >
              <div class="talent-node__symbol" aria-hidden="true">
                <span>{{ node.type === 'notable' ? '◆' : '◇' }}</span>
              </div>

              <div class="talent-node__body">
                <h3>{{ nodeName(node) }}</h3>
                <p class="talent-node__subtitle">
                  {{ t(`talents.types.${node.type}`) }} · {{ t(`talents.branches.${node.branch}`) }}
                </p>
                <p class="talent-node__effect">{{ nodeDescription(node) }}</p>
                <div class="talent-node__progress">
                  <span class="talent-node__dots" :aria-label="rankLabel(node)">
                    <i
                      v-for="rank in node.maxRank"
                      :key="rank"
                      :class="{ 'is-filled': rank <= rankOf(node) }"
                    />
                  </span>
                  <strong>{{
                    t('talents.nodeRank', { rank: rankOf(node), max: node.maxRank })
                  }}</strong>
                </div>
              </div>

              <div class="talent-node__controls">
                <button
                  type="button"
                  :disabled="!canDecrease(node)"
                  :aria-label="t('talents.removeRank', { name: nodeName(node) })"
                  @click.stop="emit('remove', node.nodeId)"
                >
                  −
                </button>
                <button
                  type="button"
                  :disabled="!canIncrease(node)"
                  :aria-label="t('talents.addRank', { name: nodeName(node) })"
                  @click.stop="emit('add', node.nodeId)"
                >
                  +
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.talent-pillars {
  padding: 1rem 0 1.5rem;
}

.talent-pillar {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--tone-fill) 45%, var(--color-line));
  border-top: 0.4rem solid var(--tone-fill);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tone-fill) 14%, transparent),
      transparent 12rem
    ),
    var(--color-bg-card);
}

.talent-pillar::before {
  content: '';
  position: absolute;
  top: 5.25rem;
  bottom: 1rem;
  left: 50%;
  width: 1px;
  background: color-mix(in srgb, var(--tone-fill) 28%, transparent);
}

.talent-pillar__header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 5.25rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg-card);
}

.talent-pillar__sigil {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid var(--tone-fill);
  transform: rotate(45deg);
}

.talent-pillar__sigil i {
  width: 0.7rem;
  height: 0.7rem;
  background: var(--tone-fill);
}

.talent-pillar__header h2 {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 850;
  color: var(--tone);
}

.talent-pillar__header p {
  margin-top: 0.2rem;
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.talent-pillar__tiers {
  position: relative;
  z-index: 2;
  padding: 0.7rem 0.8rem 1.2rem;
}

.talent-tier + .talent-tier {
  margin-top: 1.4rem;
}

.talent-tier__gate {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 0.2rem;
  font-size: 0.65rem;
  font-weight: 750;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.talent-tier.is-locked .talent-tier__gate {
  color: var(--color-vermilion);
}

.talent-tier__nodes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.1rem 0.55rem;
  padding: 0 0.2rem;
}

.talent-node {
  position: relative;
  padding-top: 1rem;
  outline: none;
}

.talent-node__symbol {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 50%;
  display: grid;
  width: 2.1rem;
  height: 2.1rem;
  place-items: center;
  border: 1px solid var(--tone-fill);
  background: var(--color-bg-card);
  color: var(--tone);
  transform: translateX(-50%) rotate(45deg);
}

.talent-node__symbol span {
  font-size: 0.85rem;
  transform: rotate(-45deg);
}

.talent-node__body {
  min-height: 13rem;
  padding: 1.45rem 0.45rem 0.75rem;
  border: 1px solid var(--color-line-strong);
  background: color-mix(in srgb, var(--color-bg-soft) 92%, transparent);
  text-align: center;
  transition:
    border-color var(--dur-fast),
    background var(--dur-fast);
}

.talent-node h3 {
  min-height: 2.2rem;
  font-size: 0.85rem;
  font-weight: 750;
  line-height: 1.25;
  color: var(--color-ink-muted);
}

.talent-node__subtitle {
  margin-top: 0.25rem;
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--tone);
}

.talent-node__effect {
  min-height: 4rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.talent-node__progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.55rem;
}

.talent-node__dots {
  display: flex;
  gap: 0.3rem;
}

.talent-node__dots i {
  width: 0.55rem;
  height: 0.55rem;
  border: 1px solid var(--color-ink-faint);
  border-radius: 50%;
}

.talent-node__dots i.is-filled {
  border-color: var(--tone-fill);
  background: var(--tone-fill);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tone-fill) 15%, transparent);
}

.talent-node__progress strong {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--tone);
}

.talent-node__controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--color-line-strong);
}

.talent-node__controls button {
  min-height: 2.15rem;
  border: 0;
  background: var(--color-bg-card);
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--tone);
}

.talent-node__controls button:not(:disabled):hover {
  background: var(--tone-fill);
  color: var(--color-on-leaf);
}

.talent-node__controls button:disabled {
  color: var(--color-line-strong);
  cursor: not-allowed;
}

.talent-node.is-available .talent-node__body,
.talent-node:hover .talent-node__body,
.talent-node:focus-within .talent-node__body,
.talent-node.is-selected .talent-node__body {
  border-color: var(--tone-fill);
  background: color-mix(in srgb, var(--tone-fill) 9%, var(--color-bg-card));
}

.talent-node.is-invested .talent-node__body {
  background: color-mix(in srgb, var(--tone-fill) 16%, var(--color-bg-card));
}

.talent-node.is-invested h3,
.talent-node:hover h3,
.talent-node:focus-within h3 {
  color: var(--color-ink);
}

.talent-node.is-complete .talent-node__symbol {
  background: var(--tone-fill);
  color: var(--color-on-leaf);
}

@media (max-width: 900px) {
  .talent-tier__nodes {
    grid-template-columns: 1fr;
  }
}
</style>
