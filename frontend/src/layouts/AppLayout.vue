<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSquadStore } from '../stores/squad'

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
  const phase = store.gameClock?.phase
  const phaseLabels = {
    training: 'Entraînement',
    mid_cycle: 'Milieu de cycle',
    operation_live: 'Opération live',
    cycle_end: 'Fin de cycle',
  }
  return `H${hour} — ${phaseLabels[phase] || '...'}`
})

function switchLanguage(lang) {
  locale.value = lang
  store.setLanguage(lang)
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950">
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div class="flex items-center gap-3">
          <span class="text-xl">🦅</span>
          <div>
            <h1 class="text-sm font-semibold tracking-wide text-slate-100">Kage Legacy</h1>
            <p v-if="store.gameClock" class="text-xs text-slate-400">{{ t('bureau.cycle') }} : {{ cycleLabel }}</p>
          </div>
        </div>

        <nav class="hidden items-center gap-1 md:flex">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            class="rounded px-3 py-1.5 text-sm transition"
            :class="route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path))
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
          >
            {{ t(item.label) }}
          </router-link>
        </nav>

        <div class="flex items-center gap-2">
          <button
            class="rounded border border-slate-700 px-2 py-1 text-xs"
            :class="locale === 'fr' ? 'bg-slate-800 text-white' : 'text-slate-400'"
            @click="switchLanguage('fr')"
          >FR</button>
          <button
            class="rounded border border-slate-700 px-2 py-1 text-xs"
            :class="locale === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400'"
            @click="switchLanguage('en')"
          >EN</button>
        </div>
      </div>

      <nav class="flex gap-1 overflow-x-auto border-t border-slate-800 px-4 py-2 md:hidden">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="shrink-0 rounded px-3 py-1 text-xs"
          :class="route.path === item.path ? 'bg-slate-800 text-white' : 'text-slate-400'"
        >
          {{ t(item.label) }}
        </router-link>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <router-view />
    </main>
  </div>
</template>
