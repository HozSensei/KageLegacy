<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import AchievementList from '../components/achievements/AchievementList.vue'
import { useAchievementsStore } from '../stores/achievements'
import { useNotificationsStore } from '../stores/notifications.js'
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js'
import forestImage from '../assets/illustrations/forest-path.webp'
defineOptions({ name: 'JournalView' })
const { t, locale } = useI18n()
const store = useAchievementsStore()
const notifications = useNotificationsStore()
useOnboardingVisit('visit_journal')
const message = ref(null)
const filter = ref('all')
const categories = ['all', 'combat', 'missions', 'collection', 'mastery', 'progression']
const filtered = computed(() => filter.value === 'all' ? store.achievements : store.achievements.filter((a) => a.category === filter.value))
onMounted(async () => {
  await store.fetchRegistry()
})
async function onClaim({ key, tier }) {
  message.value = null
  const result = await store.claimTier(key, tier)
  message.value = result ? t('achievements.claimSuccess') : store.error
  if (result) {
    void notifications.fetchNotifications()
  }
}
</script>
<template>
  <div class="page-shell" data-testid="journal-page">
    <PageHeader tone="indigo" :kicker="t('achievements.kicker')" :title="t('achievements.title')" :lead="t('achievements.lead')" :image="forestImage" image-position="50% 40%" />
    <section v-if="store.meta" class="ach-summary" data-tone="indigo">
      <p class="ach-summary__stat"><span class="ach-summary__label">{{ t('achievements.unlocked') }}</span><span class="ach-summary__value">{{ store.unlockedCount }} / {{ store.totalCount }}</span></p>
      <p v-if="store.claimableCount" class="ach-summary__claimable">{{ t('achievements.claimable', { n: store.claimableCount }) }}</p>
    </section>
    <p v-if="message" class="ach-message" role="status">{{ message }}</p>
    <p v-if="store.loading" class="mt-8 text-ink-muted">{{ t('common.loading') }}</p>
    <template v-else>
      <div class="ach-filters" role="tablist">
        <button v-for="cat in categories" :key="cat" type="button" class="ach-filters__btn" :class="{ 'ach-filters__btn--active': filter === cat }" :data-testid="`ach-filter-${cat}`" @click="filter = cat">{{ t(`achievements.categories.${cat}`) }}</button>
      </div>
      <AchievementList :achievements="filtered" :locale="locale" :busy="store.actionLoading" @claim="onClaim" />
    </template>
  </div>
</template>
<style scoped>
.ach-summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:1rem 1.75rem;margin-top:1.75rem;padding-bottom:1rem;border-bottom:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}
.ach-summary__label{display:block;font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-muted)}
.ach-summary__value{font-family:var(--font-display);font-size:1.75rem;line-height:1.1}
.ach-summary__claimable{margin:0;color:var(--tone-leaf,#3d6b4f);font-weight:600}
.ach-message{margin-top:1rem;color:var(--tone-leaf,#3d6b4f)}
.ach-filters{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.5rem 0 .75rem}
.ach-filters__btn{appearance:none;border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);background:transparent;color:var(--ink-muted);padding:.35rem .75rem;font-size:.8125rem;cursor:pointer}
.ach-filters__btn--active{color:var(--ink);border-color:var(--ink);background:color-mix(in srgb,var(--ink) 6%,transparent)}
</style>
