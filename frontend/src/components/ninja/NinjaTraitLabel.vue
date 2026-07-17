<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { traitHintKey, traitLabelKey, traitToneClass } from '../../utils/characterTraits.js'

defineOptions({ name: 'NinjaTraitLabel' })

const props = defineProps({
  ninja: { type: Object, required: true },
  /** Affiche l'infobulle (stat boostée, sans chiffre +1/+2). */
  tooltip: { type: Boolean, default: true },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md'].includes(v),
  },
})

const { t } = useI18n()

const trait = computed(() => props.ninja.character_trait ?? props.ninja.characterTrait ?? null)
const boost = computed(() => props.ninja.trait_boost ?? props.ninja.traitBoost ?? null)
const toneClass = computed(() => traitToneClass(boost.value))
const label = computed(() => t(traitLabelKey(trait.value)))
const hint = computed(() => t(traitHintKey(trait.value)))

const textClass = computed(() => {
  if (props.size === 'xs') return 'text-[10px] italic leading-snug'
  if (props.size === 'sm') return 'text-xs italic leading-snug'
  return 'text-sm italic leading-snug'
})
</script>

<template>
  <div v-if="tooltip" class="trait-tooltip">
    <p :class="[textClass, toneClass]">{{ label }}</p>
    <div class="trait-tooltip__panel" role="tooltip">
      <p :class="toneClass">{{ hint }}</p>
    </div>
  </div>
  <p v-else :class="[textClass, toneClass]">{{ label }}</p>
</template>
