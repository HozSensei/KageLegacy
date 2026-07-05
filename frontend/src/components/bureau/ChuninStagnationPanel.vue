<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

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
        <p class="font-display text-lg text-ink">{{ ninja.name.split(' ')[0] }}</p>
        <p class="mt-2 text-[11px] text-fire">{{ t('bureau.chuninStagnation.warning') }}</p>
        <p v-if="ninja.profile?.combatPeak" class="mt-2 text-[11px] text-ink-faint">
          {{ t('bureau.chuninStagnation.combatPeak', { value: ninja.profile.combatPeak }) }}
        </p>
      </li>
    </ul>
  </section>
</template>
