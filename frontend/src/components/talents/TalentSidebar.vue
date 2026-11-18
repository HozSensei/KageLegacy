<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { talentBranchTone } from '../../utils/talentVisuals';

defineOptions({ name: 'TalentSidebar' });

const props = defineProps({
  selected: { type: Object, default: null },
  pointsAvailable: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  pendingPoints: { type: Number, default: 0 },
  actionLoading: { type: Boolean, default: false },
  locale: { type: String, default: 'fr' },
});
const emit = defineEmits(['commit', 'respec']);
const { t } = useI18n();
const selectedTone = computed(() => talentBranchTone(props.selected?.branch));

function nodeName(node) {
  return props.locale === 'en' ? node?.nameEn : node?.nameFr;
}

function nodeDescription(node) {
  return props.locale === 'en' ? node?.descriptionEn : node?.descriptionFr;
}
</script>

<template>
  <aside class="talent-sidebar" data-testid="talent-sidebar">
    <section class="talent-sidebar__selection" :data-tone="selected ? selectedTone : 'neutral'">
      <template v-if="selected">
        <p class="talent-sidebar__eyebrow">
          {{ t(`talents.types.${selected.type}`) }} ·
          {{ t(`talents.branches.${selected.branch}`) }}
        </p>
        <h2>{{ nodeName(selected) }}</h2>
        <p class="talent-sidebar__effect">{{ nodeDescription(selected) }}</p>
        <div class="talent-sidebar__rank">
          <span>{{
            t('talents.nodeRank', { rank: selected.currentRank, max: selected.maxRank })
          }}</span>
          <span v-if="selected.pendingRank" class="talent-sidebar__pending">
            {{ t('talents.pendingRanks', { count: selected.pendingRank }) }}
          </span>
        </div>
      </template>
      <template v-else>
        <p class="talent-sidebar__empty-kicker">{{ t('talents.detailTitle') }}</p>
        <p>{{ t('talents.detailHint') }}</p>
      </template>
    </section>

    <section class="talent-sidebar__commit">
      <p class="talent-sidebar__points">
        <span>{{ t('talents.pointsLabel') }}</span>
        <strong>{{ pointsAvailable - pendingPoints }}</strong>
      </p>
      <p v-if="pendingCount" class="talent-sidebar__batch">
        {{ t('talents.pendingPoints', { count: pendingCount }) }}
      </p>
      <button
        type="button"
        class="btn-primary btn-lg btn-block"
        data-testid="commit-talents"
        :disabled="actionLoading || pendingCount === 0"
        @click="emit('commit')"
      >
        {{ actionLoading ? t('talents.working') : t('talents.commit') }}
      </button>
      <p class="talent-sidebar__notice">{{ t('talents.commitHint') }}</p>
    </section>

    <button type="button" class="btn-ghost btn-block" @click="emit('respec')">
      {{ t('talents.respecOpen') }}
    </button>
  </aside>
</template>

<style scoped>
.talent-sidebar {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.talent-sidebar__selection {
  min-height: 15rem;
  padding: 1.25rem;
  border-top: 0.4rem solid var(--tone-fill);
  background: var(--color-bg-card);
  color: var(--color-ink-muted);
}

.talent-sidebar__eyebrow,
.talent-sidebar__empty-kicker {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tone);
}

.talent-sidebar h2 {
  margin-top: 0.5rem;
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 850;
  line-height: 1.05;
  color: var(--color-ink);
}

.talent-sidebar__effect {
  margin-top: 1rem;
  font-size: 0.95rem;
  line-height: 1.55;
}

.talent-sidebar__rank {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-line);
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--color-ink);
}

.talent-sidebar__pending,
.talent-sidebar__batch {
  color: var(--tone);
}

.talent-sidebar__commit {
  padding: 1rem;
  background: var(--color-bg-soft);
}

.talent-sidebar__points {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.9rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.talent-sidebar__points strong {
  font-family: var(--font-display);
  font-size: 2.2rem;
  line-height: 1;
  color: var(--color-leaf);
}

.talent-sidebar__batch {
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  font-weight: 750;
}

.talent-sidebar__notice {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--color-ink-faint);
}
</style>
