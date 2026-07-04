<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaCard from '../components/ninja/NinjaCard.vue'
import { useNinjaDisplay } from '../composables/useNinjaDisplay.js'

const { t } = useI18n()
const store = useSquadStore()
const selectedNinja = ref(null)

const formationSlots = computed(() => {
  const byPos = Object.fromEntries(store.activeSquad.map((n) => [n.squad_position, n]))
  return [
    { pos: 1, label: 'Avant', ninja: byPos[1] },
    { pos: 2, label: 'Gauche', ninja: byPos[2] },
    { pos: 3, label: 'Droite', ninja: byPos[3] },
  ]
})

const teamSpeed = computed(() =>
  store.activeSquad.reduce((acc, n) => acc + n.vitesse + n.intelligence, 0)
)

const selectedDisplay = computed(() => selectedNinja.value)
const { overall: selOverall, elementTone: selElement, statKeys } = useNinjaDisplay(selectedDisplay)

function selectNinja(ninja) {
  selectedNinja.value = ninja
}

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
  if (store.activeSquad[0]) selectedNinja.value = store.activeSquad[0]
})
</script>

<template>
  <div class="page-shell">
    <header>
      <p class="page-kicker">Composition</p>
      <h1 class="page-title mt-3">{{ t('nav.squad') }}</h1>
      <p class="page-lead">Disposition tactique et remplaçants disponibles avant le gel des consignes.</p>
    </header>

    <dl v-if="store.sensei" class="metric-row mt-12">
      <div class="metric-item">
        <dd class="metric-value">{{ teamSpeed }}</dd>
        <dt class="metric-label">Vitesse tactique</dt>
      </div>
      <div class="metric-item">
        <dd class="metric-value">{{ store.activeSquad.length }}</dd>
        <dt class="metric-label">Actifs</dt>
      </div>
      <div class="metric-item">
        <dd class="metric-value">{{ store.bench.length }}</dd>
        <dt class="metric-label">Banc</dt>
      </div>
    </dl>

    <div class="mt-14 lg:grid lg:grid-cols-12 lg:gap-12">
      <!-- Fiche sélectionnée -->
      <aside class="lg:col-span-3">
        <p class="section-label">Sélection</p>
        <template v-if="selectedNinja">
          <h2 class="mt-3 font-display text-2xl text-ink">{{ selectedNinja.name }}</h2>
          <p class="mt-2 text-sm" :class="selElement">{{ selectedNinja.element_affinity }}</p>
          <p class="mt-1 font-display text-4xl text-ink">{{ selOverall }}</p>
          <dl class="mt-6 space-y-2 border-t border-line pt-5">
            <div v-for="key in statKeys" :key="key" class="flex justify-between text-sm">
              <dt class="text-ink-faint">{{ t(`ninja.stats.${key}`) }}</dt>
              <dd class="tabular-nums text-ink">{{ selectedNinja[key] }}</dd>
            </div>
          </dl>
        </template>
      </aside>

      <!-- Terrain -->
      <div class="mt-12 lg:col-span-6 lg:mt-0">
        <p class="section-label">Formation 1 · 2</p>
        <div class="relative mt-8 min-h-[380px]">
          <div class="absolute inset-0 border border-line/60" />
          <div class="absolute left-1/2 top-8 bottom-8 w-px -translate-x-1/2 bg-line/40" />

          <div class="relative flex h-full min-h-[380px] flex-col items-center justify-between py-12">
            <NinjaCard
              v-if="formationSlots[0].ninja"
              :ninja="formationSlots[0].ninja"
              variant="pitch"
              :slot-label="formationSlots[0].label"
              :selected="selectedNinja?.id === formationSlots[0].ninja.id"
              @select="selectNinja"
            />
            <div v-else class="text-xs uppercase tracking-widest text-ink-faint">Avant</div>

            <div class="flex w-full max-w-xs justify-between px-6">
              <template v-for="slot in formationSlots.slice(1)" :key="slot.pos">
                <NinjaCard
                  v-if="slot.ninja"
                  :ninja="slot.ninja"
                  variant="pitch"
                  :slot-label="slot.label"
                  :selected="selectedNinja?.id === slot.ninja.id"
                  @select="selectNinja"
                />
                <span v-else class="text-xs uppercase tracking-widest text-ink-faint">{{ slot.label }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste banc (desktop) -->
      <aside class="hidden lg:col-span-3 lg:block">
        <p class="section-label">Remplaçants</p>
        <ul class="mt-4 divide-y divide-line border-t border-line">
          <li
            v-for="ninja in store.bench"
            :key="ninja.id"
            class="cursor-pointer py-3 transition hover:text-accent"
            :class="selectedNinja?.id === ninja.id ? 'text-accent' : 'text-ink-muted'"
            @click="selectNinja(ninja)"
          >
            <span class="font-display text-lg text-ink">{{ ninja.name }}</span>
            <span class="ml-2 text-xs text-ink-faint">{{ ninja.element_affinity }}</span>
          </li>
        </ul>
      </aside>
    </div>

    <!-- Banc horizontal -->
    <section class="mt-16 border-t border-line pt-10">
      <p class="section-label">Banc</p>
      <div class="mt-4 flex gap-0 overflow-x-auto divide-x divide-line border-t border-line">
        <NinjaCard
          v-for="ninja in store.bench"
          :key="ninja.id"
          :ninja="ninja"
          variant="bench"
          :selected="selectedNinja?.id === ninja.id"
          @select="selectNinja"
        />
      </div>
    </section>
  </div>
</template>
