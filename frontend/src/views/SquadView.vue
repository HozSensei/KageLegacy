<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaFlipCard from '../components/ninja/NinjaFlipCard.vue'

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
      <p class="page-lead">Disposition tactique et remplaçants. Retournez les cartes pour les détails.</p>
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
      <aside class="lg:col-span-3">
        <p class="section-label">Sélection</p>
        <template v-if="selectedNinja">
          <h2 class="mt-3 font-display text-2xl text-ink">{{ selectedNinja.name }}</h2>
          <p class="mt-2 text-sm text-ink-muted">{{ selectedNinja.element_affinity }} · {{ t(`grades.${selectedNinja.grade}`) }}</p>
          <p class="mt-4 text-sm italic text-ink-faint">{{ t(`traits.${selectedNinja.character_trait}.label`) }}</p>
        </template>
        <p v-else class="mt-3 text-sm text-ink-faint">Sélectionnez une carte.</p>
      </aside>

      <!-- Terrain -->
      <div class="mt-12 lg:col-span-6 lg:mt-0">
        <p class="section-label">Formation 1 · 2</p>
        <div class="relative mt-8 min-h-[400px] border border-line/50 bg-bg-soft/30">
          <div class="absolute left-1/2 top-10 bottom-10 w-px -translate-x-1/2 bg-accent-soft/15" />

          <div class="relative flex min-h-[400px] flex-col items-center justify-between py-10">
            <NinjaFlipCard
              v-if="formationSlots[0].ninja"
              :ninja="formationSlots[0].ninja"
              size="sm"
              :slot-label="formationSlots[0].label"
              :selected="selectedNinja?.id === formationSlots[0].ninja.id"
              @select="selectNinja"
            />
            <div v-else class="text-xs uppercase tracking-widest text-ink-faint">Avant</div>

            <div class="flex w-full max-w-sm justify-between px-4">
              <template v-for="slot in formationSlots.slice(1)" :key="slot.pos">
                <NinjaFlipCard
                  v-if="slot.ninja"
                  :ninja="slot.ninja"
                  size="sm"
                  :slot-label="slot.label"
                  :selected="selectedNinja?.id === slot.ninja.id"
                  @select="selectNinja"
                />
                <span v-else class="self-center text-xs uppercase tracking-widest text-ink-faint">{{ slot.label }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>

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
          </li>
        </ul>
      </aside>
    </div>

    <!-- Banc : cartes compactes retournables -->
    <section class="mt-16 border-t border-line pt-10">
      <p class="section-label">Banc</p>
      <p class="mt-1 text-xs text-ink-faint">Cartes compactes — clic pour retourner</p>
      <div class="mt-6 flex gap-4 overflow-x-auto pb-4">
        <NinjaFlipCard
          v-for="ninja in store.bench"
          :key="ninja.id"
          :ninja="ninja"
          size="xs"
          :selected="selectedNinja?.id === ninja.id"
          @select="selectNinja"
        />
      </div>
    </section>
  </div>
</template>
