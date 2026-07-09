<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const store = useSquadStore()

const heritage = computed(() => store.heritage)
const scrolls = computed(() => heritage.value?.scrolls || [])
const bonuses = computed(() => heritage.value?.bonuses)
</script>

<template>
  <div
    v-if="heritage"
    class="mt-10 border-t border-line pt-8"
    data-testid="bureau-heritage-panel"
  >
    <p class="section-label">{{ t('bureau.heritageTitle') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-muted">
      {{ t('bureau.heritageHint') }}
    </p>

    <div v-if="bonuses?.scrollCount" class="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-muted">
      <span v-if="bonuses.trainingDiscountPct">
        {{ t('bureau.heritageBonusTraining', { pct: bonuses.trainingDiscountPct }) }}
      </span>
      <span v-if="bonuses.dispensaryDiscountPct">
        {{ t('bureau.heritageBonusDispensary', { pct: bonuses.dispensaryDiscountPct }) }}
      </span>
      <span v-if="bonuses.matchShopDiscountPct">
        {{ t('bureau.heritageBonusMatchShop', { pct: bonuses.matchShopDiscountPct }) }}
      </span>
      <span v-if="bonuses.bureauShopDiscountPct">
        {{ t('bureau.heritageBonusBureauShop', { pct: bonuses.bureauShopDiscountPct }) }}
      </span>
    </div>

    <div v-if="scrolls.length" class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      <div
        v-for="scroll in scrolls"
        :key="scroll.id"
        class="heritage-scroll flex min-h-[88px] flex-col justify-between border border-line/80 bg-ink/30 p-3 text-xs"
        :title="scroll.ninjaName"
      >
        <p class="font-medium text-ink line-clamp-2">{{ scroll.ninjaName }}</p>
        <p class="mt-2 text-ink-faint">
          {{ scroll.dominantStatLabel }} · {{ scroll.peakValue }}
        </p>
      </div>
    </div>

    <p v-else class="mt-4 text-xs text-ink-faint">
      {{ t('bureau.heritageEmpty') }}
    </p>
  </div>
</template>

<style scoped>
.heritage-scroll {
  background-image: linear-gradient(145deg, rgba(212, 175, 55, 0.06), transparent 55%);
}
</style>
