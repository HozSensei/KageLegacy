<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'

const { t } = useI18n()
const store = useSquadStore()

const stagnantNinjas = computed(() => {
  const all = [...store.activeSquad, ...store.bench]
  return all
    .filter((n) => n.stagnationRisk)
    .map((n) => ({
      ninja: n,
      messageKey:
        n.stagnationKind === 'chunin_jonin'
          ? 'bureau.stagnation.chuninJonin'
          : 'bureau.stagnation.geninExam',
    }))
})

const hasStagnation = computed(() => stagnantNinjas.value.length > 0)
</script>

<template>
  <div
    v-if="hasStagnation"
    class="mt-10 border-l-2 border-fire pl-4"
    role="alert"
  >
    <p class="text-xs font-medium uppercase tracking-[0.14em] text-fire">
      {{ t('bureau.stagnation.title') }}
    </p>
    <p class="mt-2 text-sm text-ink-muted">{{ t('bureau.stagnation.lead') }}</p>
    <ul class="mt-4 space-y-2">
      <li
        v-for="{ ninja, messageKey } in stagnantNinjas"
        :key="ninja.id"
        class="text-sm text-ink"
      >
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NinjaListIdentity :ninja="ninja" compact first-name-only />
          <span class="text-ink-muted">— {{ t(messageKey) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
