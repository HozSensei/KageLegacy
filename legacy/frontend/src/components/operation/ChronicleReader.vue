<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  chronicleSegmentClass,
  highlightChronicleText,
} from '../../utils/highlightChronicle.js'
import PliExchangeBlock from './PliExchangeBlock.vue'

const props = defineProps({
  segments: { type: Array, default: () => [] },
  cast: {
    type: Object,
    default: () => ({ senseiIdentities: [], ninjas: [] }),
  },
  emptyText: { type: String, default: '' },
})

const { t } = useI18n()

const renderedSegments = computed(() =>
  (props.segments || []).map((segment) => {
    const exchange = segment.exchange
    const hasVersus =
      segment.kind === 'pli' &&
      exchange &&
      (exchange.left?.actor || exchange.right?.actor)

    if (hasVersus) {
      return { ...segment, mode: 'pli' }
    }
    return {
      ...segment,
      mode: 'text',
      html: highlightChronicleText(segment.text, {
        senseiIdentities: props.cast.senseiIdentities,
        ninjas: props.cast.ninjas,
        eliteBadgeLabel: t('eliteIdentity.eliteShort'),
        eliteBadgeTitle: t('eliteIdentity.eliteBadge'),
      }),
    }
  })
)
</script>

<template>
  <div class="chronicle-reader" data-testid="operation-chronicle">
    <template v-if="renderedSegments.length">
      <template v-for="segment in renderedSegments" :key="segment.order">
        <PliExchangeBlock
          v-if="segment.mode === 'pli'"
          :exchange="segment.exchange"
        />
        <p
          v-else
          :class="chronicleSegmentClass(segment.blockType)"
          v-html="segment.html"
        />
      </template>
    </template>
    <p v-else class="chronicle-segment chronicle-segment--empty text-ink-faint">
      {{ emptyText }}
    </p>
  </div>
</template>
