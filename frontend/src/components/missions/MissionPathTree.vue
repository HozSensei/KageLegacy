<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MissionPathNode from './MissionPathNode.vue';
import {
  choiceById,
  countSubtreeSteps,
  findPathStartId,
  indexNodes,
  resolvePreviewChoiceId,
  visibleBranchChoices,
  walkSegment,
} from '../../utils/missionPathTree.js';
import { localizedField } from '../../utils/localeContent.js';

defineOptions({ name: 'MissionPathTree' });

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  /** Point d’entrée du segment (null = racine du parcours). */
  startId: { type: String, default: null },
  /** Index d’affichage du premier nœud de ce segment. */
  baseIndex: { type: Number, default: 1 },
  /** Profondeur visuelle (0 = tronc). */
  depth: { type: Number, default: 0 },
  /** Id du nœud qui accueille le panneau événement (slot node-detail). */
  detailNodeId: { type: String, default: null },
  /** Inclure les nœuds écartés (chemin non pris, grisé). */
  includeSkipped: { type: Boolean, default: false },
  /** Suite d’un carrefour : le rail vertical continue (pas de coupure is-first). */
  continuesFromParent: { type: Boolean, default: false },
  nodeLabel: { type: Function, required: true },
  nodeHint: { type: Function, required: true },
  nodeShape: { type: Function, required: true },
  nodeTone: { type: Function, required: true },
});

const emit = defineEmits(['preview-choice']);

const { t, locale } = useI18n();

/** Aperçu local par id de carrefour — permet N niveaux de sous-arbres. */
const previewByBranch = ref({});

const nodesById = computed(() => indexNodes(props.nodes));

const resolvedStartId = computed(
  () => props.startId || findPathStartId(props.nodes)
);

const segment = computed(() =>
  walkSegment(nodesById.value, resolvedStartId.value, {
    includeSkipped: props.includeSkipped,
  })
);

const branchNode = computed(() => {
  const last = segment.value[segment.value.length - 1];
  return last?.type === 'branch' ? last : null;
});

const linearBeforeBranch = computed(() => {
  if (!branchNode.value) return segment.value;
  return segment.value.slice(0, -1);
});

const choices = computed(() =>
  visibleBranchChoices(branchNode.value, nodesById.value)
);

/** Après choix : onglets restent (non-choisi grisé) ; seule la branche prise continue la timeline. */
const branchResolved = computed(() => Boolean(branchNode.value?.chosen));

const showTabs = computed(() => choices.value.length > 1);

const activeChoiceId = computed(() =>
  resolvePreviewChoiceId(branchNode.value, nodesById.value, previewByBranch.value)
);

const activeChoice = computed(() =>
  choiceById(branchNode.value, activeChoiceId.value)
);

/** Une seule fourche sous les tabs : aperçu actif, ou chemin pris après résolution. */
const displayedForks = computed(() => {
  if (!branchNode.value) return [];
  if (branchResolved.value) {
    const chosen = choiceById(branchNode.value, branchNode.value.chosen);
    return chosen?.nextNodeId ? [chosen] : [];
  }
  const choice = activeChoice.value;
  return choice?.nextNodeId ? [choice] : [];
});

const hasContinuingFork = computed(() => displayedForks.value.length > 0);

const nextBaseIndex = computed(
  () => props.baseIndex + segment.value.length
);

watch(
  () => [branchNode.value?.id, branchNode.value?.chosen, choices.value.map(c => c.id).join(',')],
  () => {
    const branch = branchNode.value;
    if (!branch) return;
    const current = previewByBranch.value[branch.id];
    const resolved = resolvePreviewChoiceId(branch, nodesById.value, previewByBranch.value);
    if (resolved && current !== resolved) {
      previewByBranch.value = { ...previewByBranch.value, [branch.id]: resolved };
    }
  },
  { immediate: true }
);

function selectChoice(choiceId) {
  const branch = branchNode.value;
  if (!branch || branch.chosen) return;
  previewByBranch.value = { ...previewByBranch.value, [branch.id]: choiceId };
  emit('preview-choice', { branchId: branch.id, choiceId });
}

function choiceLabel(choice) {
  const labeled = localizedField(choice, 'label', locale.value);
  if (labeled) return labeled;
  if (choice?.lengthHint === 'short') return t('combat.pathShort');
  if (choice?.lengthHint === 'long') return t('combat.pathLong');
  return t('combat.pathChoiceFallback');
}

function isTabActive(choice) {
  if (branchResolved.value) return isChosenFork(choice);
  return activeChoiceId.value === choice.id;
}

function isChosenFork(choice) {
  return branchNode.value?.chosen === choice.id;
}

function isSkippedFork(choice) {
  return Boolean(branchNode.value?.chosen) && !isChosenFork(choice);
}

function choiceStepCount(choice) {
  return countSubtreeSteps(nodesById.value, choice.nextNodeId, {
    includeSkipped: isSkippedFork(choice) || props.includeSkipped,
  });
}

function indexLabel(node, ordinal) {
  if (node.type === 'mystery' && !node.revealed) return '?';
  return ordinal;
}

function statusLabel(node) {
  return t(`combat.nodeStatus.${node.status}`, node.status);
}
</script>

<template>
  <div
    class="path-tree"
    :class="{ 'path-tree--nested': depth > 0 }"
    :data-depth="depth"
    :data-testid="depth === 0 ? 'run-path' : `run-path-depth-${depth}`"
  >
    <ol
      v-if="segment.length"
      class="path-tree__list"
      :data-testid="depth === 0 ? 'run-path-trunk' : undefined"
    >
      <MissionPathNode
        v-for="(node, i) in linearBeforeBranch"
        :key="node.id"
        :node="node"
        :index-label="indexLabel(node, baseIndex + i)"
        :title="nodeLabel(node)"
        :hint="nodeHint(node)"
        :status-label="statusLabel(node)"
        :shape="nodeShape(node)"
        :tone="nodeTone(node)"
        :boss-tag="t('combat.bossTag')"
        :is-first="i === 0 && !continuesFromParent"
        :is-last="!branchNode && i === linearBeforeBranch.length - 1"
      >
        <slot v-if="detailNodeId === node.id" name="node-detail" :node="node" />
      </MissionPathNode>
      <MissionPathNode
        v-if="branchNode"
        :node="branchNode"
        :index-label="indexLabel(branchNode, baseIndex + linearBeforeBranch.length)"
        :title="nodeLabel(branchNode)"
        :hint="nodeHint(branchNode)"
        :status-label="statusLabel(branchNode)"
        :shape="nodeShape(branchNode)"
        :tone="nodeTone(branchNode)"
        :is-first="linearBeforeBranch.length === 0 && !continuesFromParent"
        :is-last="!hasContinuingFork"
      >
        <slot
          v-if="detailNodeId === branchNode.id"
          name="node-detail"
          :node="branchNode"
        />
      </MissionPathNode>
    </ol>

    <div
      v-if="showTabs"
      class="path-tree__tabs"
      :class="{ 'path-tree__tabs--resolved': branchResolved }"
      role="tablist"
      :aria-label="t('combat.pathTabsLabel')"
      data-testid="run-path-tabs"
    >
      <button
        v-for="choice in choices"
        :key="choice.id"
        type="button"
        role="tab"
        class="path-tree__tab"
        :class="{
          'path-tree__tab--active': isTabActive(choice),
          'path-tree__tab--skipped': isSkippedFork(choice),
        }"
        :aria-selected="isTabActive(choice)"
        :aria-disabled="branchResolved ? 'true' : undefined"
        :disabled="branchResolved"
        :data-testid="`run-path-tab-${choice.id}`"
        @click="selectChoice(choice.id)"
      >
        <span class="path-tree__tab-name">{{ choiceLabel(choice) }}</span>
        <span v-if="choice.xpMult" class="path-tree__tab-meta">
          {{ t('combat.branchXpTag', { n: choice.xpMult }) }}
        </span>
        <span class="path-tree__tab-count">
          {{ t('combat.pathTabSteps', { n: choiceStepCount(choice) }) }}
        </span>
      </button>
    </div>

    <div
      v-for="choice in displayedForks"
      :key="choice.id"
      class="path-tree__fork"
      :class="{ 'path-tree__fork--continues': true }"
      :data-branch="choice.id"
      data-testid="run-path-fork"
    >
      <MissionPathTree
        :nodes="nodes"
        :start-id="choice.nextNodeId"
        :base-index="nextBaseIndex"
        :depth="depth + 1"
        :detail-node-id="detailNodeId"
        :include-skipped="includeSkipped"
        :continues-from-parent="true"
        :node-label="nodeLabel"
        :node-hint="nodeHint"
        :node-shape="nodeShape"
        :node-tone="nodeTone"
        @preview-choice="emit('preview-choice', $event)"
      >
        <template #node-detail="slotProps">
          <slot name="node-detail" v-bind="slotProps" />
        </template>
      </MissionPathTree>
    </div>
  </div>
</template>

<style scoped>
.path-tree {
  max-width: 44rem;
}

.path-tree--nested {
  max-width: none;
}

.path-tree__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: visible;
}

.path-tree__tabs {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
  /* Aligné sous la colonne des puces pour prolonger le rail. */
  margin: 0.15rem 0 0.15rem;
  padding: 0.45rem 0.1rem 0.45rem 3.25rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

/* Segment de rail derrière les onglets (continuité timeline). */
.path-tree__tabs::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(3.25rem / 2);
  width: 3px;
  background: var(--color-leaf-fill);
  transform: translateX(-50%);
  pointer-events: none;
}

.path-tree__tab {
  display: grid;
  gap: 0.12rem;
  flex: 1 1 0;
  min-width: 7.25rem;
  justify-items: start;
  padding: 0.55rem 0.65rem;
  border: 1.5px solid var(--color-line-strong);
  background: color-mix(in srgb, var(--color-ink) 6%, var(--color-bg));
  color: var(--color-ink-muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-base) ease,
    background var(--dur-base) ease,
    color var(--dur-base) ease,
    box-shadow var(--dur-base) ease,
    opacity var(--dur-base) ease;
}

.path-tree__tab:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-sky-fill) 70%, var(--color-line-strong));
  color: var(--color-ink);
  background: color-mix(in srgb, var(--color-sky-fill) 14%, var(--color-bg));
}

.path-tree__tab--active {
  border-color: var(--color-sky-fill);
  background: color-mix(in srgb, var(--color-sky-fill) 22%, var(--color-sky-tint));
  color: var(--color-ink);
  box-shadow: inset 0 -3px 0 var(--color-sky-fill);
}

.path-tree__tab--skipped {
  opacity: 0.45;
  cursor: default;
  border-color: color-mix(in srgb, var(--color-ink-faint) 55%, var(--color-line));
  background: color-mix(in srgb, var(--color-ink) 4%, var(--color-bg));
  color: var(--color-ink-faint);
  box-shadow: none;
}

.path-tree__tab:disabled {
  cursor: default;
}

.path-tree__tab-name {
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.15;
}

.path-tree__tab-meta,
.path-tree__tab-count {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-ink-muted);
}

.path-tree__tab--active .path-tree__tab-meta,
.path-tree__tab--active .path-tree__tab-count {
  color: var(--color-ink);
}

.path-tree__tab--skipped .path-tree__tab-meta,
.path-tree__tab--skipped .path-tree__tab-count {
  color: var(--color-ink-faint);
}

/* Suite du chemin choisi : pas de filet bleu / caption — continuité du tronc. */
.path-tree__fork--continues {
  position: relative;
  margin: 0;
  padding: 0;
  border: 0;
}

@media (max-width: 479px) {
  .path-tree__tabs {
    padding-left: 3.25rem;
  }

  .path-tree__tab {
    min-width: 6.75rem;
    padding: 0.5rem 0.55rem;
  }

  .path-tree__tab-name {
    font-size: 0.85rem;
  }
}
</style>
