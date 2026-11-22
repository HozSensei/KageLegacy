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
  nodeLabel: { type: Function, required: true },
  nodeHint: { type: Function, required: true },
  nodeShape: { type: Function, required: true },
  nodeTone: { type: Function, required: true },
  /** Synchronise l’aperçu avec un choix d’événement (id de choix). */
  focusChoiceId: { type: String, default: null },
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
  walkSegment(nodesById.value, resolvedStartId.value)
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

const showTabs = computed(() => choices.value.length > 1);

const activeChoiceId = computed(() =>
  resolvePreviewChoiceId(branchNode.value, nodesById.value, previewByBranch.value)
);

const activeChoice = computed(() =>
  choiceById(branchNode.value, activeChoiceId.value)
);

const forkStartId = computed(() => activeChoice.value?.nextNodeId || null);

const forkStepCount = computed(() =>
  forkStartId.value ? countSubtreeSteps(nodesById.value, forkStartId.value) : 0
);

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

watch(
  () => props.focusChoiceId,
  id => {
    const branch = branchNode.value;
    if (!branch || !id) return;
    if (!choiceById(branch, id)) return;
    previewByBranch.value = { ...previewByBranch.value, [branch.id]: id };
  }
);

function selectChoice(choiceId) {
  const branch = branchNode.value;
  if (!branch) return;
  previewByBranch.value = { ...previewByBranch.value, [branch.id]: choiceId };
  emit('preview-choice', { branchId: branch.id, choiceId });
}

function choiceLabel(choice) {
  return localizedField(choice, 'label', locale.value) || choice.id;
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
        :is-first="i === 0"
        :is-last="!branchNode && i === linearBeforeBranch.length - 1"
      />
      <MissionPathNode
        v-if="branchNode"
        :node="branchNode"
        :index-label="indexLabel(branchNode, baseIndex + linearBeforeBranch.length)"
        :title="nodeLabel(branchNode)"
        :hint="nodeHint(branchNode)"
        :status-label="statusLabel(branchNode)"
        :shape="nodeShape(branchNode)"
        :tone="nodeTone(branchNode)"
        :is-first="linearBeforeBranch.length === 0"
        :is-last="!forkStartId && !showTabs"
      />
    </ol>

    <div
      v-if="showTabs"
      class="path-tree__tabs"
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
        :class="{ 'path-tree__tab--active': activeChoiceId === choice.id }"
        :aria-selected="activeChoiceId === choice.id"
        :data-testid="`run-path-tab-${choice.id}`"
        @click="selectChoice(choice.id)"
      >
        <span class="path-tree__tab-name">{{ choiceLabel(choice) }}</span>
        <span v-if="choice.xpMult" class="path-tree__tab-meta">
          {{ t('combat.branchXpTag', { n: choice.xpMult }) }}
        </span>
        <span class="path-tree__tab-count">
          {{
            t('combat.pathTabSteps', {
              n: countSubtreeSteps(nodesById, choice.nextNodeId),
            })
          }}
        </span>
      </button>
    </div>

    <div
      v-if="forkStartId"
      class="path-tree__fork"
      :data-branch="activeChoiceId"
      data-testid="run-path-fork"
    >
      <p v-if="showTabs && activeChoice" class="path-tree__fork-caption">
        {{ t('combat.pathForkCaption', { path: choiceLabel(activeChoice) }) }}
        <span v-if="forkStepCount" class="path-tree__fork-meta">
          · {{ t('combat.pathTabSteps', { n: forkStepCount }) }}
        </span>
      </p>
      <MissionPathTree
        :nodes="nodes"
        :start-id="forkStartId"
        :base-index="nextBaseIndex"
        :depth="depth + 1"
        :node-label="nodeLabel"
        :node-hint="nodeHint"
        :node-shape="nodeShape"
        :node-tone="nodeTone"
        @preview-choice="emit('preview-choice', $event)"
      />
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
}

.path-tree__tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
  margin: 0.85rem 0 0.35rem;
  padding: 0.15rem 0.1rem 0.35rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
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
    box-shadow var(--dur-base) ease;
}

.path-tree__tab:hover {
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

.path-tree__fork {
  position: relative;
  margin-top: 0.35rem;
  padding: 0.35rem 0 0 0.85rem;
  border-left: 3px solid color-mix(in srgb, var(--color-sky-fill) 55%, var(--color-line));
}

.path-tree__fork-caption {
  margin: 0 0 0.35rem 0.35rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.path-tree__fork-meta {
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.path-tree--nested .path-tree__fork {
  margin-left: 0.15rem;
}

@media (max-width: 479px) {
  .path-tree__fork {
    padding-left: 0.55rem;
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
