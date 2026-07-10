<script setup>
import { computed } from 'vue'
import {
  chronicleSegmentClass,
  highlightChronicleText,
} from '../../utils/highlightChronicle.js'

const props = defineProps({
  segments: { type: Array, default: () => [] },
  cast: { type: Object, default: () => ({ senseis: [], ninjas: [] }) },
  emptyText: { type: String, default: '' },
})

const renderedSegments = computed(() =>
  (props.segments || []).map((segment) => ({
    ...segment,
    html: highlightChronicleText(segment.text, props.cast),
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
