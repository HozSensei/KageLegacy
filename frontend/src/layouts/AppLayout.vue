<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSquadStore } from '../stores/squad'
import TopoBackground from '../components/ui/TopoBackground.vue'

const { t, locale } = useI18n()
const route = useRoute()
const store = useSquadStore()

const navItems = [
  { name: 'bureau', path: '/', label: 'nav.bureau' },
  { name: 'squad', path: '/squad', label: 'nav.squad' },
  { name: 'market', path: '/market', label: 'nav.market' },
  { name: 'inventory', path: '/inventory', label: 'nav.inventory' },
  { name: 'operation', path: '/operation', label: 'nav.operation' },
]

const cycleLabel = computed(() => {
  const hour = store.gameClock?.hour ?? 0
  const phases = {
    training: 'Entraînement',
    mid_cycle: 'Milieu de cycle',
    operation_live: 'Opération',
    cycle_end: 'Fin de cycle',
  }
  return `H${hour} · ${phases[store.gameClock?.phase] || '…'}`
})

const activeLabel = computed(() => {
  const item = navItems.find((n) =>
    n.path === '/' ? route.path === '/' : route.path.startsWith(n.path)
  )
  return item ? t(item.label) : ''
})

function isActive(path) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

onMounted(() => {
  if (!store.sensei) store.fetchSquad()
})
</script>

<template>
  <div class="relative min-h-screen">
    <TopoBackground />

    <!-- Top bar — épuré, type éditorial -->
    <header class="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 sm:px-10">
        <div class="min-w-0">
          <p class="page-kicker truncate">
            Kage Legacy <span class="text-ink-faint/60">/</span> {{ activeLabel }}
          </p>
        </div>

        <nav class="hidden items-center gap-8 md:flex">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            class="nav-link"
            :class="{ 'nav-link-active': isActive(item.path) }"
          >
            {{ t(item.label) }}
          </router-link>
        </nav>

        <div class="flex shrink-0 items-center gap-4">
          <span v-if="store.gameClock" class="hidden text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:inline">
            {{ cycleLabel }}
          </span>
          <div class="flex gap-1 text-[11px] uppercase tracking-[0.14em]">
            <button
              class="px-1.5 py-0.5 transition"
              :class="locale === 'fr' ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'"
              @click="locale = 'fr'"
            >Fr</button>
            <span class="text-ink-faint/40">/</span>
            <button
              class="px-1.5 py-0.5 transition"
              :class="locale === 'en' ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'"
              @click="locale = 'en'"
            >En</button>
          </div>
        </div>
      </div>

      <!-- Mobile nav -->
      <nav class="flex gap-5 overflow-x-auto border-t border-line px-6 py-2.5 md:hidden">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="shrink-0 nav-link"
          :class="{ 'nav-link-active': isActive(item.path) }"
        >
          {{ t(item.label) }}
        </router-link>
      </nav>
    </header>

    <main class="pb-16">
      <router-view />
    </main>
  </div>
</template>
