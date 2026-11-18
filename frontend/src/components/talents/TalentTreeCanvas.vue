<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { talentBranchTone } from '../../utils/talentVisuals';

defineOptions({ name: 'TalentTreeCanvas' });

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  nodeRanks: { type: Object, default: () => ({}) },
  branchPoints: { type: Object, default: () => ({}) },
  selectedNodeId: { type: String, default: null },
  isUnlockable: { type: Function, default: () => false },
  locale: { type: String, default: 'fr' },
});

const emit = defineEmits(['select', 'unlock']);
const { t } = useI18n();
const BRANCHES = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

const pillars = computed(() =>
  BRANCHES.map(branch => ({
    branch,
    points: Number(props.branchPoints[branch]) || 0,
    tiers: [1, 2, 3, 4, 5, 6]
      .map(tier =>
        props.nodes
          .filter(node => node.branch === branch && node.tier === tier)
          .sort((a, b) => a.positionX - b.positionX)
      )
      .filter(nodes => nodes.length),
  })).filter(pillar => pillar.tiers.length)
);

function rankOf(node) {
  return Number(props.nodeRanks[node.nodeId]) || 0;
}

function nodeLabel(node) {
  return props.locale === 'en' ? node.nameEn : node.nameFr;
}

function nodeClass(node) {
  const rank = rankOf(node);
  return [
    'talent-node',
    `talent-node--${node.type}`,
    rank > 0 && 'is-unlocked',
    rank >= node.maxRank && 'is-complete',
    props.isUnlockable(node) && 'is-unlockable',
    props.selectedNodeId === node.nodeId && 'is-selected',
  ];
}

function tierRequirement(nodes) {
  return Number(nodes[0]?.requiredBranchPoints) || 0;
}

function tierLocked(nodes, branch) {
  return (Number(props.branchPoints[branch]) || 0) < tierRequirement(nodes);
}

function rankLabel(node) {
  return `${rankOf(node)}/${node.maxRank}`;
}

function selectNode(node) {
  emit('select', node.nodeId);
}

function unlockNode(node) {
  if (props.isUnlockable(node)) emit('unlock', node.nodeId);
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
        <span class="talent-pillar__sigil" aria-hidden="true">◆</span>
        <div>
          <p class="talent-pillar__branch">{{ t(`talents.branches.${pillar.branch}`) }}</p>
          <p class="talent-pillar__points">
            {{ t('talents.branchPoints', { count: pillar.points }) }}
          </p>
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
            <button
              v-for="node in tierNodes"
              :key="node.nodeId"
              type="button"
              :class="nodeClass(node)"
              :aria-pressed="selectedNodeId === node.nodeId"
              :aria-label="`${nodeLabel(node)}, ${rankLabel(node)}`"
              :data-testid="`talent-node-${node.nodeId}`"
              :data-node-id="node.nodeId"
              @click="selectNode(node)"
              @dblclick="unlockNode(node)"
            >
              <span v-if="node.requires.length" class="talent-node__link" aria-hidden="true" />
              <span class="talent-node__mark" aria-hidden="true" />
              <span class="talent-node__name">{{ nodeLabel(node) }}</span>
              <span class="talent-node__ranks" :aria-label="rankLabel(node)">
                <i
                  v-for="rank in node.maxRank"
                  :key="rank"
                  :class="{ 'is-filled': rank <= rankOf(node) }"
                />
              </span>
              <span class="talent-node__rank">{{ rankLabel(node) }}</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.talent-pillars {
  display: grid;
  grid-template-columns: repeat(4, minmax(15rem, 1fr));
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-color: var(--color-line-strong) transparent;
}

.talent-pillar {
  position: relative;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--tone-fill) 50%, var(--color-line));
  border-top: 0.35rem solid var(--tone-fill);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tone-fill) 13%, transparent),
      transparent 10rem
    ),
    var(--color-bg-card);
}

.talent-pillar::after {
  content: '';
  position: absolute;
  inset: 4.5rem auto 0 50%;
  width: 1px;
  background: color-mix(in srgb, var(--tone-fill) 32%, transparent);
  pointer-events: none;
}

.talent-pillar__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4.5rem;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg-card);
}

.talent-pillar__sigil {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: 1px solid var(--tone-fill);
  color: var(--tone-fill);
  transform: rotate(45deg);
}

.talent-pillar__branch {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1;
  color: var(--tone);
}

.talent-pillar__points {
  margin-top: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.talent-pillar__tiers {
  position: relative;
  z-index: 1;
  padding: 0.4rem 0.7rem 0.9rem;
}

.talent-tier + .talent-tier {
  margin-top: 0.75rem;
}

.talent-tier__gate {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
  padding: 0.2rem 0.15rem;
  font-size: 0.625rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.talent-tier.is-locked .talent-tier__gate {
  color: var(--color-vermilion);
}

.talent-tier__nodes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.talent-node {
  position: relative;
  display: flex;
  min-height: 7.25rem;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0.7rem 0.3rem 0.45rem;
  border: 1px solid var(--color-line-strong);
  background: var(--color-bg-soft);
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    border-color var(--dur-fast),
    background var(--dur-fast),
    transform var(--dur-fast),
    opacity var(--dur-fast);
}

.talent-node:hover,
.talent-node.is-selected {
  border-color: var(--tone-fill);
  transform: translateY(-2px);
}

.talent-node.is-unlockable {
  border-color: var(--tone-fill);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tone-fill) 35%, transparent);
  color: var(--color-ink);
}

.talent-node.is-unlocked {
  background: color-mix(in srgb, var(--tone-fill) 15%, var(--color-bg-card));
  color: var(--color-ink);
}

.talent-node.is-complete {
  border-color: var(--tone-fill);
  background: color-mix(in srgb, var(--tone-fill) 25%, var(--color-bg-card));
}

.talent-node__link {
  position: absolute;
  bottom: calc(100% + 1px);
  left: 50%;
  width: 1px;
  height: 1.35rem;
  background: color-mix(in srgb, var(--tone-fill) 65%, var(--color-line));
}

.talent-node__mark {
  display: block;
  width: 1.1rem;
  height: 1.1rem;
  margin-bottom: 0.45rem;
  border: 1px solid currentColor;
  transform: rotate(45deg);
}

.talent-node--notable .talent-node__mark {
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone-fill) 18%, transparent);
}

.talent-node__name {
  display: -webkit-box;
  overflow: hidden;
  min-height: 2.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  -webkit-box-orient: vertical;
  line-clamp: 3;
  -webkit-line-clamp: 3;
}

.talent-node__ranks {
  display: flex;
  gap: 0.2rem;
  margin-top: auto;
}

.talent-node__ranks i {
  width: 0.4rem;
  height: 0.4rem;
  border: 1px solid currentColor;
  border-radius: 50%;
}

.talent-node__ranks i.is-filled {
  background: var(--tone-fill);
  border-color: var(--tone-fill);
}

.talent-node__rank {
  margin-top: 0.25rem;
  font-size: 0.625rem;
  font-weight: 800;
  color: var(--tone);
}

@media (max-width: 720px) {
  .talent-pillars {
    grid-template-columns: repeat(4, minmax(14rem, 1fr));
  }
}
</style>
