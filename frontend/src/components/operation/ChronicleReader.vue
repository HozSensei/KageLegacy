<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  chronicleSegmentClass,
  highlightChronicleText,
} from '../../utils/highlightChronicle.js'

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
  (props.segments || []).map((segment) => ({
    ...segment,
    html: highlightChronicleText(segment.text, {
      senseiIdentities: props.cast.senseiIdentities,
      ninjas: props.cast.ninjas,
      eliteBadgeLabel: t('eliteIdentity.eliteShort'),
      eliteBadgeTitle: t('eliteIdentity.eliteBadge'),
    }),
  }))
)
</script>

<template>
  <div class="chronicle-reader" data-testid="operation-chronicle">
    <template v-if="renderedSegments.length">
      <p
        v-for="segment in renderedSegments"
        :key="segment.order"
        :class="chronicleSegmentClass(segment.blockType)"
        v-html="segment.html"
      />
    </template>
    <p v-else class="chronicle-segment chronicle-segment--empty text-ink-faint">
      {{ emptyText }}
    </p>
  </div>
</template>
