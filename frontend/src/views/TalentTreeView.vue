<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TalentTreeCanvas from '../components/talents/TalentTreeCanvas.vue'
import TalentSidebar from '../components/talents/TalentSidebar.vue'
import RespecModal from '../components/talents/RespecModal.vue'
import { useTalentTreeStore } from '../stores/talentTree'

defineOptions({ name: 'TalentTreeView' })

const { t, locale } = useI18n()
const store = useTalentTreeStore()
const showRespec = ref(false)
const message = ref(null)

const BRANCHES = ['', 'taijutsu', 'ninjutsu', 'genjutsu', 'medicine']

const canUnlockSelected = computed(() => store.isUnlockable(store.selectedNode))

const visibleNodes = computed(() =>
  store.branchFilter ? store.filteredNodes : store.nodes
)

const visibleEdges = computed(() => {
  if (!store.branchFilter) return store.edges
  const ids = new Set(visibleNodes.value.map((n) => n.nodeId))
  return store.edges.filter((e) => ids.has(e.from.nodeId) && ids.has(e.to.nodeId))
})

onMounted(async () => {
  await store.loadAll()
})

async function onUnlock(nodeId) {
  message.value = null
  const result = await store.unlock(nodeId)
  if (result) {
    message.value = t('talents.unlockSuccess')
  } else if (store.error) {
    message.value = store.error
  }
}

async function onRespecConfirm() {
  message.value = null
  const result = await store.respecTree()
  if (result) {
    showRespec.value = false
    message.value = t('talents.respecSuccess', { count: result.pointsRefunded })
  }
}

function onSelect(nodeId) {
  store.selectNode(nodeId)
  message.value = null
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="talent-tree-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="page-kicker">{{ t('talents.kicker') }}</p>
        <h1 class="page-title mt-2">{{ t('talents.title') }}</h1>
        <p class="page-lead mt-3 max-w-xl">{{ t('talents.lead') }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="branch in BRANCHES"
          :key="branch || 'all'"
          type="button"
          class="btn-ghost text-[10px]"
          :class="{ 'ring-1 ring-accent/60': store.branchFilter === branch }"
          @click="store.setBranchFilter(branch)"
        >
          {{ branch ? t(`talents.branches.${branch}`) : t('talents.branchAll') }}
        </button>
      </div>
    </div>

    <p v-if="store.error && !message" class="mt-4 text-sm text-fire">{{ store.error }}</p>
    <p v-if="message" class="mt-4 text-sm text-accent">{{ message }}</p>

    <div class="mt-8 lg:grid lg:grid-cols-12 lg:gap-6">
      <div class="lg:col-span-8">
        <p v-if="store.loading && !store.nodes.length" class="text-sm text-ink-muted">
          {{ t('talents.loading') }}
        </p>
        <TalentTreeCanvas
          v-else
          :nodes="visibleNodes"
          :edges="visibleEdges"
          :unlocked-set="store.unlockedSet"
          :selected-node-id="store.selectedNodeId"
          :is-unlockable="store.isUnlockable"
          :locale="locale"
          @select="onSelect"
          @unlock="onUnlock"
        />
      </div>

      <div class="mt-6 lg:col-span-4 lg:mt-0">
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
    </div>

    <RespecModal
      :open="showRespec"
      :respec="store.respec"
      :unlocked-count="store.unlockedNodeIds.length"
      :loading="store.actionLoading"
      @close="showRespec = false"
      @confirm="onRespecConfirm"
    />
  </div>
</template>
