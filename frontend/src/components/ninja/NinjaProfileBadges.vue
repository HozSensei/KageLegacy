<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNinjaDisplay } from '../../composables/useNinjaDisplay.js'

const props = defineProps({
  ninja: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const { t } = useI18n()
const {
  artLabel,
  potentialLabel,
  clanTierLabel,
  potentialClass,
  clanTierClass,
  isNobleBloodline,
} = useNinjaDisplay(computed(() => props.ninja))
</script>

<template>
  <div
    class="flex flex-wrap gap-1.5"
    :class="compact ? 'text-[8px]' : 'text-[9px]'"
  >
    <span
      v-if="artLabel"
      class="rounded-sm border border-line/80 px-1.5 py-0.5 uppercase tracking-[0.1em] text-ink-muted"
    >
      {{ artLabel }}
    </span>
    <span
      v-if="potentialLabel"
      class="rounded-sm border border-line/80 px-1.5 py-0.5 uppercase tracking-[0.1em]"
      :class="potentialClass"
    >
      {{ potentialLabel }}
    </span>
    <span
      v-if="clanTierLabel"
      class="rounded-sm border px-1.5 py-0.5 uppercase tracking-[0.1em]"
      :class="[clanTierClass, isNobleBloodline ? 'bg-accent/5' : '']"
    >
      {{ clanTierLabel }}
    </span>
  </div>
</template>
