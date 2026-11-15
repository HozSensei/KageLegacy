<script setup>
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNinjaDisplay } from '../../composables/useNinjaDisplay.js'
import { STAT_COLUMNS } from '../../utils/trainingPreview.js'
import NinjaProfileBadges from './NinjaProfileBadges.vue'
import NinjaTraitLabel from './NinjaTraitLabel.vue'

defineOptions({ name: 'NinjaPanelCard' })

const props = defineProps({
  ninja: { type: Object, required: true },
  tag: {
    type: String,
    default: 'article',
    validator: (v) => ['article', 'li', 'div'].includes(v),
  },
  compact: { type: Boolean, default: false },
  bench: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showStats: { type: Boolean, default: true },
  showVitals: { type: Boolean, default: true },
  showTrait: { type: Boolean, default: true },
  showAge: { type: Boolean, default: true },
  showProfile: { type: Boolean, default: true },
  showOverall: { type: Boolean, default: true },
  showTrainingFocus: { type: Boolean, default: true },
  focusedStats: {
    type: Array,
    default: () => [],
  },
})

const { t } = useI18n()

const {
  overall,
  elementTone,
  elementLabel,
  gradeLabel,
  trainingFocusLabel,
  gradeProgress,
  formeBarWidth,
  isNobleBloodline,
} = useNinjaDisplay(toRef(props, 'ninja'))

const isChunin = computed(() => props.ninja.grade === 'Chunin')

function statCap(column) {
  return props.ninja.gradeStatCaps?.[column] ?? null
}

function statPercent(column) {
  const cap = statCap(column)
  if (!cap) return 100
  return Math.min(100, (Number(props.ninja[column] ?? 0) / cap) * 100)
}

function isFocusedStat(column) {
  return props.focusedStats.includes(column)
}
</script>

<template>
  <component
    :is="tag"
    class="ninja-panel-card"
    :class="{
      'ninja-panel-card--compact': compact,
      'ninja-panel-card--bench': bench,
      'ninja-panel-card--selected': selected,
      'ninja-panel-card--chunin': isChunin,
      'ninja-panel-card--noble': isNobleBloodline,
    }"
  >
    <header class="ninja-panel-card__header">
      <div class="ninja-panel-card__title-row">
        <p class="font-display text-ink" :class="compact ? 'text-base' : 'text-lg'">
          {{ ninja.name }}
        </p>
        <span v-if="showOverall" class="ninja-panel-card__rating">{{ overall }}</span>
      </div>

      <div class="ninja-panel-card__badges">
        <span
          v-if="gradeLabel"
          class="ninja-panel-card__badge"
        >
          {{ t(gradeLabel) }}
        </span>
        <span
          v-if="showTrainingFocus && trainingFocusLabel"
          class="ninja-panel-card__badge ninja-panel-card__badge--accent"
        >
          {{ t(trainingFocusLabel) }}
        </span>
        <span
          v-if="ninja.trainingBuff === 'strategy_book'"
          class="ninja-panel-card__badge ninja-panel-card__badge--buff"
        >
          {{ t('ninja.strategyBookBuff') }}
        </span>
        <span
          v-if="ninja.trainingBuff === 'training_weights'"
          class="ninja-panel-card__badge ninja-panel-card__badge--buff"
        >
          {{ t('ninja.trainingWeightsBuff') }}
        </span>
        <span
          v-if="elementLabel"
          class="ninja-panel-card__badge"
          :class="elementTone"
        >
          {{ t(elementLabel) }}
        </span>
      </div>

      <NinjaProfileBadges v-if="showProfile" class="mt-2" :ninja="ninja" compact />

      <p v-if="showAge && ninja.age != null" class="mt-2 text-xs text-ink-muted">
        {{ ninja.age }} {{ t('ninja.age') }}
      </p>

      <NinjaTraitLabel v-if="showTrait" class="mt-2" :ninja="ninja" size="sm" />

      <slot name="header-extra" />
    </header>

    <dl v-if="showStats" class="ninja-panel-card__stats">
      <div
        v-for="column in STAT_COLUMNS"
        :key="`${ninja.id}-${column}`"
        class="ninja-panel-stat"
        :class="{ 'ninja-panel-stat--focused': isFocusedStat(column) }"
      >
        <div class="ninja-panel-stat__head">
          <dt class="ninja-panel-stat__label">{{ t(`ninja.stats.${column}`) }}</dt>
          <dd class="ninja-panel-stat__value">
            {{ ninja[column] }}
            <span v-if="statCap(column)" class="ninja-panel-stat__cap">
              / {{ statCap(column) }}
            </span>
          </dd>
        </div>
        <div class="ninja-panel-stat__track" aria-hidden="true">
          <div
            class="ninja-panel-stat__fill"
            :style="{ width: `${statPercent(column)}%` }"
          />
        </div>
      </div>
    </dl>

    <div v-if="showVitals" class="ninja-panel-card__vitals">
      <div class="ninja-panel-vital">
        <div class="ninja-panel-vital__head">
          <span>{{ t('ninja.forme') }}</span>
          <span class="text-ink-muted">{{ t(`formes.${ninja.weekly_forme}`) }}</span>
        </div>
        <div class="ninja-panel-vital__track" aria-hidden="true">
          <div class="ninja-panel-vital__fill ninja-panel-vital__fill--forme" :style="{ width: `${formeBarWidth}%` }" />
        </div>
      </div>

      <div class="ninja-panel-vital">
        <div class="ninja-panel-vital__head">
          <span>{{ t('ninja.moral') }}</span>
          <span class="text-ink-muted">{{ ninja.moral }}/20</span>
        </div>
        <div class="ninja-panel-vital__track" aria-hidden="true">
          <div
            class="ninja-panel-vital__fill"
            :style="{ width: `${(ninja.moral / 20) * 100}%` }"
          />
        </div>
      </div>

      <div v-if="gradeProgress.show" class="ninja-panel-vital">
        <div class="ninja-panel-vital__head">
          <span>{{ t(gradeProgress.labelKey) }}</span>
          <span class="text-ink-muted">{{ gradeProgress.percent }}%</span>
        </div>
        <div class="ninja-panel-vital__track" aria-hidden="true">
          <div
            class="ninja-panel-vital__fill ninja-panel-vital__fill--progress"
            :style="{ width: `${gradeProgress.percent}%` }"
          />
        </div>
      </div>
    </div>

    <footer v-if="$slots.footer" class="ninja-panel-card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>
