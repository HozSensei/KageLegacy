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

const BRANCHES = ['', 'taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

const canUnlockSelected = computed(() => store.isUnlockable(store.selectedNode));

const visibleNodes = computed(() => (store.branchFilter ? store.filteredNodes : store.nodes));

onMounted(async () => {
  await store.loadAll();
});

async function onUnlock(nodeId) {
  message.value = null;
  const result = await store.unlock(nodeId);
  if (result) {
    message.value = t('talents.unlockSuccess');
  } else if (store.error) {
    message.value = store.error;
  }
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

    <div class="talent-filter" role="group" :aria-label="t('talents.filterLabel')">
      <span class="t-kicker">{{ t('talents.filterLabel') }}</span>
      <div class="chip-row">
        <button
          v-for="branch in BRANCHES"
          :key="branch || 'all'"
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

    <p v-if="store.error && !message" class="alert alert--error mt-4">{{ store.error }}</p>
    <p v-if="message" class="alert alert--success mt-4">{{ message }}</p>

    <div class="talent-layout">
      <div class="min-w-0">
        <p v-if="store.loading && !store.nodes.length" class="text-ink-muted">
          {{ t('talents.loading') }}
        </p>
        <TalentTreeCanvas
          v-else
          :nodes="visibleNodes"
          :node-ranks="store.nodeRanks"
          :branch-points="store.branchPoints"
          :selected-node-id="store.selectedNodeId"
          :is-unlockable="store.isUnlockable"
          :locale="locale"
          @select="onSelect"
          @unlock="onUnlock"
        />
      </div>

      <TalentSidebar
        :points="store.talentPointsAvailable"
        :bonuses="store.bonuses"
        :effects="store.effects"
        :selected="store.selectedNode"
        :can-unlock-selected="canUnlockSelected"
        :action-loading="store.actionLoading"
        :locale="locale"
        @unlock="onUnlock"
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
.talent-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-top: 1.5rem;
}

.chip[aria-pressed='true'] .chip__mark {
  color: var(--tone-fill);
}

.talent-layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

@media (min-width: 1024px) {
  .talent-layout {
    grid-template-columns: minmax(0, 1fr) 19rem;
    gap: 1.75rem;
    align-items: start;
  }
}
</style>
