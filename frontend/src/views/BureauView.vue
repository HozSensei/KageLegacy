<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import SenseiCard from '../components/sensei/SenseiCard.vue'
import NinjaCard from '../components/ninja/NinjaCard.vue'

const { t, locale } = useI18n()
const store = useSquadStore()

onMounted(async () => {
  await store.fetchSquad()
  if (store.sensei?.language) locale.value = store.sensei.language
})
</script>

<template>
  <div>
    <h2 class="mb-6 text-xl font-semibold text-slate-100">{{ t('bureau.title') }}</h2>

    <p v-if="store.loading" class="text-slate-400">Chargement...</p>
    <p v-else-if="store.error" class="text-red-400">{{ store.error }}</p>

    <template v-else-if="store.sensei">
      <div
        v-if="store.gameClock?.phase === 'operation_live'"
        class="mb-6 rounded-lg border border-orange-800/50 bg-orange-950/30 px-4 py-3 text-sm text-orange-200"
      >
        {{ t('bureau.operationLive') }} —
        <router-link to="/operation" class="underline hover:text-orange-100">voir le rapport</router-link>
      </div>

      <div class="grid gap-6 lg:grid-cols-4">
        <div class="lg:col-span-1">
          <SenseiCard :sensei="store.sensei" />
        </div>

        <div class="lg:col-span-3">
          <h3 class="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">
            {{ t('bureau.activeSquad') }}
          </h3>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NinjaCard v-for="ninja in store.activeSquad" :key="ninja.id" :ninja="ninja" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
