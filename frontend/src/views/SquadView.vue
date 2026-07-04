<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import PageHeader from '../components/ui/PageHeader.vue'
import StatCard from '../components/ui/StatCard.vue'
import Badge from '../components/ui/Badge.vue'
import SenseiCard from '../components/sensei/SenseiCard.vue'
import NinjaCard from '../components/ninja/NinjaCard.vue'

const { t } = useI18n()
const store = useSquadStore()
const selectedNinja = ref(null)

const formationSlots = computed(() => {
  const byPos = Object.fromEntries(
    store.activeSquad.map((n) => [n.squad_position, n])
  )
  return [
    { pos: 1, label: 'Avant', ninja: byPos[1] },
    { pos: 2, label: 'Gauche', ninja: byPos[2] },
    { pos: 3, label: 'Droite', ninja: byPos[3] },
  ]
})

const teamSpeed = computed(() =>
  store.activeSquad.reduce((acc, n) => acc + n.vitesse + n.intelligence, 0)
)

const teamElements = computed(() => {
  const counts = {}
  for (const n of store.activeSquad) {
    counts[n.element_affinity] = (counts[n.element_affinity] || 0) + 1
  }
  return counts
})

function selectNinja(ninja) {
  selectedNinja.value = ninja
}

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
  if (store.activeSquad[0]) selectedNinja.value = store.activeSquad[0]
})
</script>

<template>
  <div>
    <PageHeader
      class="mb-8"
      :title="t('nav.squad')"
      description="Composition tactique et gestion des remplaçants."
    />

    <dl v-if="store.sensei" class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Vitesse tactique" :value="teamSpeed" accent="text-sky-400" />
      <StatCard label="Effectif" :value="store.activeSquad.length + store.bench.length" />
      <StatCard label="Actifs" :value="store.activeSquad.length" accent="text-green-400" />
      <StatCard label="Banc" :value="store.bench.length" />
    </dl>

    <!-- FIFA-inspired layout: sidebar + pitch + detail -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <!-- Left: Sensei + selected ninja detail -->
      <div class="space-y-6 xl:col-span-3">
        <SenseiCard v-if="store.sensei" :sensei="store.sensei" compact />

        <div v-if="selectedNinja" class="overflow-hidden rounded-lg bg-gray-800/50 ring-1 ring-white/10">
          <div class="border-b border-white/10 px-4 py-3">
            <h3 class="text-sm font-semibold text-white">Fiche sélectionnée</h3>
          </div>
          <div class="px-4 py-4">
            <p class="font-semibold text-white">{{ selectedNinja.name }}</p>
            <div class="mt-2 flex flex-wrap gap-1">
              <Badge color="blue">{{ t(`grades.${selectedNinja.grade}`) }}</Badge>
              <Badge color="orange">{{ selectedNinja.element_affinity }}</Badge>
            </div>
            <dl class="mt-4 space-y-2 text-sm">
              <div v-for="key in ['taijutsu','ninjutsu','genjutsu','medecine','vitesse','intelligence']" :key="key" class="flex justify-between">
                <dt class="text-gray-400">{{ t(`ninja.stats.${key}`) }}</dt>
                <dd class="font-medium text-white">{{ selectedNinja[key] }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Center: tactical pitch -->
      <div class="xl:col-span-6">
        <div class="overflow-hidden rounded-xl bg-gradient-to-b from-emerald-950/40 via-gray-900 to-gray-950 ring-1 ring-white/10">
          <div class="border-b border-white/10 px-4 py-3 sm:px-6">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-white">Formation 1-2</h3>
              <Badge color="gray">3 ninjas</Badge>
            </div>
          </div>

          <!-- Pitch -->
          <div class="relative min-h-[420px] bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.08)_0%,_transparent_70%)] p-6 sm:p-10">
            <div class="pointer-events-none absolute inset-6 rounded-lg border border-emerald-500/20 sm:inset-10" />
            <div class="pointer-events-none absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-emerald-500/10 sm:top-10 sm:bottom-10" />

            <div class="relative flex h-full min-h-[360px] flex-col items-center justify-between py-4">
              <!-- Slot 1 - Avant -->
              <div class="flex justify-center">
                <NinjaCard
                  v-if="formationSlots[0].ninja"
                  :ninja="formationSlots[0].ninja"
                  variant="pitch"
                  :slot-label="formationSlots[0].label"
                  :selected="selectedNinja?.id === formationSlots[0].ninja.id"
                  @select="selectNinja"
                />
                <div v-else class="flex size-36 items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-xs text-gray-500">
                  Slot avant
                </div>
              </div>

              <!-- Slots 2 & 3 -->
              <div class="flex w-full max-w-md justify-between gap-8 px-4">
                <template v-for="slot in formationSlots.slice(1)" :key="slot.pos">
                  <NinjaCard
                    v-if="slot.ninja"
                    :ninja="slot.ninja"
                    variant="pitch"
                    :slot-label="slot.label"
                    :selected="selectedNinja?.id === slot.ninja.id"
                    @select="selectNinja"
                  />
                  <div v-else class="flex size-36 items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-xs text-gray-500">
                    {{ slot.label }}
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Element synergy row -->
          <div class="border-t border-white/10 px-4 py-3 sm:px-6">
            <p class="text-xs text-gray-500">Affinités de l'escouade</p>
            <div class="mt-1 flex flex-wrap gap-2">
              <Badge v-for="(count, el) in teamElements" :key="el" color="cyan">{{ count }}× {{ el }}</Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: quick bench preview on large screens -->
      <div class="hidden xl:col-span-3 xl:block">
        <div class="overflow-hidden rounded-lg bg-gray-800/50 ring-1 ring-white/10">
          <div class="border-b border-white/10 px-4 py-3">
            <h3 class="text-sm font-semibold text-white">Remplaçants</h3>
            <p class="text-xs text-gray-500">{{ store.bench.length }} disponibles</p>
          </div>
          <ul class="max-h-[480px] divide-y divide-white/5 overflow-y-auto">
            <li
              v-for="ninja in store.bench"
              :key="ninja.id"
              class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-white/5"
              :class="selectedNinja?.id === ninja.id ? 'bg-white/5' : ''"
              @click="selectNinja(ninja)"
            >
              <span class="text-lg font-bold text-white">{{ Math.round((ninja.taijutsu + ninja.ninjutsu + ninja.genjutsu + ninja.medecine + ninja.vitesse + ninja.intelligence) / 6) }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white">{{ ninja.name }}</p>
                <p class="text-xs text-gray-500">{{ ninja.clan_name }} · {{ ninja.element_affinity }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Bench tray (FIFA-style horizontal scroll) -->
    <div class="mt-8 overflow-hidden rounded-lg bg-gray-800/50 ring-1 ring-white/10">
      <div class="border-b border-white/10 px-4 py-3 sm:px-6">
        <h3 class="text-sm font-semibold text-white">Banc / Remplaçants</h3>
        <p class="text-xs text-gray-500">Sélectionnez un ninja pour voir sa fiche détaillée.</p>
      </div>
      <div class="flex gap-3 overflow-x-auto p-4 sm:p-6">
        <NinjaCard
          v-for="ninja in store.bench"
          :key="ninja.id"
          :ninja="ninja"
          variant="bench"
          :selected="selectedNinja?.id === ninja.id"
          @select="selectNinja"
        />
      </div>
    </div>
  </div>
</template>
