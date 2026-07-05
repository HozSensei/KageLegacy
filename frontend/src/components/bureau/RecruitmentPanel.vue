<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const store = useSquadStore()
const buying = ref(false)

const recruitment = computed(() => store.recruitment)

async function purchase(offerId) {
  buying.value = true
  try {
    await store.purchaseRecruitment(offerId)
  } finally {
    buying.value = false
  }
}
</script>

<template>
  <div v-if="recruitment" class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.recruitmentTitle') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-muted">
      {{ t('bureau.recruitmentHint') }}
    </p>
    <p v-if="!recruitment.windowOpen" class="mt-2 text-xs text-fire">
      {{ t('bureau.recruitmentClosed') }}
    </p>
    <p v-else-if="recruitment.purchasedThisCycle" class="mt-2 text-xs text-accent">
      {{ t('bureau.recruitmentDone') }}
    </p>

    <ul class="mt-4 space-y-3">
      <li
        v-for="offer in recruitment.offers"
        :key="offer.id"
        class="border border-line p-4 text-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-medium text-ink">{{ offer.candidate.name }}</p>
            <p class="mt-1 text-xs text-ink-muted">
              {{ offer.candidate.clanTierLabel }} · {{ offer.candidate.potential }} ·
              {{ t(`ninja.stats.${offer.candidate.primaryArt}`) }}
            </p>
            <p v-if="offer.candidate.profile?.artLabel" class="mt-1 text-xs text-ink-faint">
              {{ offer.candidate.profile.artLabel }} · {{ offer.candidate.profile.potentialLabel }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-ink">{{ offer.price.toLocaleString() }} Ryos</p>
            <button
              v-if="recruitment.windowOpen && !recruitment.purchasedThisCycle && !offer.purchased"
              type="button"
              class="btn-ghost mt-2"
              :disabled="buying"
              @click="purchase(offer.id)"
            >
              {{ t('bureau.recruitmentBuy') }}
            </button>
            <span v-else-if="offer.purchased" class="mt-2 block text-xs text-accent">
              {{ t('bureau.recruitmentHired') }}
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
