<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useEliteStore } from '../stores/elite'
import VerifiedIcon from '../components/icons/VerifiedIcon.vue'
import EliteToolsPanel from '../components/bureau/EliteToolsPanel.vue'

defineOptions({ name: 'EliteToolsView' })

const { t } = useI18n()
const elite = useEliteStore()

const isActive = computed(() => Boolean(elite.subscription?.isActive))

onMounted(async () => {
  if (!elite.subscription) await elite.fetchElite()
  if (elite.subscription?.isActive) await elite.fetchTools()
})
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="elite-tools-page">
    <header class="flex flex-wrap items-start gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <VerifiedIcon size="1.5rem" />
          <h1 class="font-display text-3xl text-ink">{{ t('eliteTools.pageTitle') }}</h1>
        </div>
        <p class="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {{ t('eliteTools.pageLead') }}
        </p>
      </div>
    </header>

    <p v-if="elite.loading && !elite.subscription" class="mt-10 text-sm text-ink-muted">
      {{ t('common.loading') }}
    </p>

    <div
      v-else-if="!isActive"
      class="mt-10 border border-line/60 bg-bg-card/40 px-5 py-6 text-sm"
      data-testid="elite-tools-locked"
    >
      <p class="text-ink-muted">{{ t('eliteTools.subscribersOnly') }}</p>
      <RouterLink to="/profil" class="btn-ghost mt-4 text-[10px]">
        {{ t('eliteTools.goProfile') }}
      </RouterLink>
    </div>

    <EliteToolsPanel v-else class="!mt-0" :embedded="true" />
  </div>
</template>
