<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { ninjaOverallRating } from '../../utils/ninjaRating.js'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'

const { t } = useI18n()
const store = useSquadStore()

const chuninStagnant = computed(() => {
  const all = [...store.activeSquad, ...store.bench]
  return all.filter((n) => n.grade === 'Chunin' && n.stagnationKind === 'chunin_jonin')
})
</script>

<template>
  <section v-if="chuninStagnant.length" class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.chuninStagnation.title') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-faint">{{ t('bureau.chuninStagnation.lead') }}</p>

    <ul class="mt-6 space-y-4">
      <li
        v-for="ninja in chuninStagnant"
        :key="ninja.id"
        class="border border-fire/30 bg-fire/5 p-4"
      >
        <NinjaListIdentity :ninja="ninja" compact first-name-only />
        <p class="mt-2 text-[11px] text-fire">{{ t('bureau.chuninStagnation.warning') }}</p>
        <p class="mt-2 text-[11px] text-ink-faint">
          {{ t('bureau.chuninStagnation.averageRating', { value: ninjaOverallRating(ninja) }) }}
        </p>
      </li>
    </ul>
  </section>
</template>
