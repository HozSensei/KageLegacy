<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import PageHeader from '../components/ui/PageHeader.vue'
import StatCard from '../components/ui/StatCard.vue'
import Alert from '../components/ui/Alert.vue'
import SenseiCard from '../components/sensei/SenseiCard.vue'
import NinjaCard from '../components/ninja/NinjaCard.vue'

const { t, locale } = useI18n()
const store = useSquadStore()

const squadPower = computed(() => {
  if (!store.activeSquad.length) return 0
  const sum = store.activeSquad.reduce((acc, n) => {
    return acc + n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine + n.vitesse + n.intelligence
  }, 0)
  return Math.round(sum / store.activeSquad.length)
})

onMounted(async () => {
  await store.fetchSquad()
  if (store.sensei?.language) locale.value = store.sensei.language
})
</script>

<template>
  <div>
    <PageHeader
      class="mb-8"
      :title="t('bureau.title')"
      description="Résumé de votre dojo, de l'escouade active et de l'état du cycle."
    />

    <div v-if="store.loading" class="text-sm text-gray-400">Chargement...</div>
    <p v-else-if="store.error" class="text-sm text-red-400">{{ store.error }}</p>

    <template v-else-if="store.sensei">
      <Alert v-if="store.gameClock?.phase === 'operation_live'" variant="info" class="mb-8">
        <p class="text-sm text-orange-200">
          {{ t('bureau.operationLive') }} —
          <router-link to="/operation" class="font-semibold underline">voir le rapport</router-link>
        </p>
      </Alert>

      <!-- Stats row (Tailwind UI: Stats) -->
      <dl class="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard :label="t('sensei.ryos')" :value="store.sensei.ryos.toLocaleString()" accent="text-amber-400" />
        <StatCard :label="t('sensei.reputation')" :value="store.sensei.reputation" />
        <StatCard :label="t('sensei.chakra')" :value="`${store.sensei.chakraPool}/100`" accent="text-cyan-400" />
        <StatCard :label="t('bureau.activeSquad')" :value="squadPower" hint="Note moyenne de l'escouade" accent="text-indigo-400" />
      </dl>

      <div class="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div class="xl:col-span-1">
          <SenseiCard :sensei="store.sensei" />
        </div>

        <div class="xl:col-span-2">
          <div class="mb-4 border-b border-white/10 pb-3">
            <h3 class="text-base font-semibold text-white">{{ t('bureau.activeSquad') }}</h3>
            <p class="mt-1 text-sm text-gray-400">Les trois ninjas sélectionnés pour la prochaine Opération.</p>
          </div>
          <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
            <NinjaCard v-for="ninja in store.activeSquad" :key="ninja.id" :ninja="ninja" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
