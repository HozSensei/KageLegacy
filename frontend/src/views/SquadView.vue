<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaCard from '../components/ninja/NinjaCard.vue'

const { t } = useI18n()
const store = useSquadStore()

onMounted(() => {
  if (!store.sensei) store.fetchSquad()
})
</script>

<template>
  <div>
    <h2 class="mb-6 text-xl font-semibold">{{ t('nav.squad') }}</h2>

    <section class="mb-8">
      <h3 class="mb-4 text-sm uppercase tracking-wide text-slate-500">Formation active (3)</h3>
      <div class="grid gap-4 md:grid-cols-3">
        <NinjaCard v-for="ninja in store.activeSquad" :key="ninja.id" :ninja="ninja" />
      </div>
    </section>

    <section>
      <h3 class="mb-4 text-sm uppercase tracking-wide text-slate-500">Banc / Remplaçants</h3>
      <div class="flex gap-3 overflow-x-auto pb-2">
        <div
          v-for="ninja in store.bench"
          :key="ninja.id"
          class="w-72 shrink-0"
        >
          <NinjaCard :ninja="ninja" />
        </div>
      </div>
    </section>
  </div>
</template>
