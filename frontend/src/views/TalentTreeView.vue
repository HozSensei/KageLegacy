<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TalentTreeCanvas from '../components/talents/TalentTreeCanvas.vue';
import TalentSidebar from '../components/talents/TalentSidebar.vue';
import RespecModal from '../components/talents/RespecModal.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { talentBranchTone } from '../utils/talentVisuals';
import forestImage from '../assets/illustrations/forest-path.webp';
import { useTalentTreeStore } from '../stores/talentTree';

defineOptions({ name: 'TalentTreeView' });

const { t, locale } = useI18n();
const store = useTalentTreeStore();
const showRespec = ref(false);
const message = ref(null);
store.setBranchFilter('');

const BRANCHES = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

const visibleNodes = computed(() => (store.branchFilter ? store.filteredNodes : store.nodes));

onMounted(async () => {
  await store.loadAll();
});

function onAdd(nodeId) {
  message.value = null;
  store.addPending(nodeId);
}

function onRemove(nodeId) {
  message.value = null;
  if (!store.removePending(nodeId)) message.value = t('talents.removePendingBlocked');
}

async function onCommit() {
  message.value = null;
  const result = await store.commitPending();
  if (result) message.value = t('talents.unlockSuccess', { count: result.committed });
  else if (store.error) message.value = store.error;
}

async function onRespecConfirm() {
  message.value = null;
  const result = await store.respecTree();
  if (result) {
    showRespec.value = false;
    message.value = t('talents.respecSuccess', { count: result.pointsRefunded });
  }
}

function onSelect(nodeId) {
  store.selectNode(nodeId);
  message.value = null;
}
</script>

<template>
  <div class="page-shell" data-testid="talent-tree-page">
    <PageHeader
      tone="leaf"
      :kicker="t('talents.kicker')"
      :title="t('talents.title')"
      :lead="t('talents.lead')"
      :image="forestImage"
      image-position="50% 30%"
    />

    <div class="talent-toolbar">
      <div class="talent-filter" role="group" :aria-label="t('talents.filterLabel')">
        <span class="t-kicker">{{ t('talents.filterLabel') }}</span>
        <div class="chip-row">
          <button
            v-for="branch in BRANCHES"
            :key="branch"
            type="button"
            class="chip"
            :aria-pressed="store.branchFilter === branch"
            :data-tone="branch ? talentBranchTone(branch) : 'neutral'"
            @click="store.setBranchFilter(branch)"
          >
            <span v-if="branch" class="dot chip__mark" aria-hidden="true" />
            {{ branch ? t(`talents.branches.${branch}`) : t('talents.branchAll') }}
          </button>
        </div>
      </div>
      <div class="talent-toolbar__summary">
        <span class="talent-toolbar__points">
          {{ t('talents.pointsLabel') }} <strong>{{ store.talentPointsAvailable }}</strong>
        </span>
        <span>{{ t('talents.pointsInvested', { count: store.spentPoints }) }}</span>
      </div>
    </div>

    <p v-if="store.error && !message" class="alert alert--error mt-4">{{ store.error }}</p>
    <p v-if="message" class="alert alert--success mt-4">{{ message }}</p>

    <div class="talent-layout">
      <div class="min-w-0">
        <p v-if="store.loading && !store.nodes.length" class="text-ink-muted">
          {{ t('talents.loading') }}
        </p>
        <section v-else-if="!store.branchFilter" class="talent-empty" data-testid="talent-empty">
          <span aria-hidden="true">◇</span>
          <h2>{{ t('talents.chooseTreeTitle') }}</h2>
          <p>{{ t('talents.chooseTreeHint') }}</p>
        </section>
        <TalentTreeCanvas
          v-else
          :nodes="visibleNodes"
          :node-ranks="store.effectiveRanks"
          :pending-ranks="store.pendingRanks"
          :branch-points="store.effectiveBranchPoints"
          :points-available="store.remainingPoints"
          :action-loading="store.actionLoading"
          :selected-node-id="store.selectedNodeId"
          :is-unlockable="store.isUnlockable"
          :locale="locale"
          @select="onSelect"
          @add="onAdd"
          @remove="onRemove"
        />
      </div>
      <TalentSidebar
        :selected="store.selectedNode"
        :points-available="store.talentPointsAvailable"
        :pending-count="store.pendingSequence.length"
        :pending-points="store.pendingSequence.length"
        :action-loading="store.actionLoading"
        :locale="locale"
        @commit="onCommit"
        @respec="showRespec = true"
      />
    </div>

    <RespecModal
      :open="showRespec"
      :respec="store.respec"
      :unlocked-count="store.spentPoints"
      :loading="store.actionLoading"
      @close="showRespec = false"
      @confirm="onRespecConfirm"
    />
  </div>
</template>

<style scoped>
.talent-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 0.8rem 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
}

.talent-filter,
.talent-toolbar__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.talent-toolbar__summary {
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--color-ink-muted);
}

.talent-toolbar__points {
  color: var(--color-ink);
}

.talent-toolbar__points strong {
  margin-left: 0.4rem;
  font-family: var(--font-display);
  font-size: 1.7rem;
  color: var(--color-leaf);
}

.chip[aria-pressed='true'] .chip__mark {
  color: var(--tone-fill);
}

.talent-layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1rem;
}

.talent-empty {
  display: grid;
  min-height: 24rem;
  place-content: center;
  padding: 2rem;
  border: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-bg-card) 92%, transparent);
  text-align: center;
}

.talent-empty > span {
  font-size: 3rem;
  color: var(--color-line-strong);
}

.talent-empty h2 {
  margin-top: 0.75rem;
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 850;
}

.talent-empty p {
  max-width: 32rem;
  margin-top: 0.5rem;
  color: var(--color-ink-muted);
}

@media (min-width: 1024px) {
  .talent-layout {
    grid-template-columns: minmax(0, 1fr) 19rem;
    align-items: start;
  }
}
</style>
