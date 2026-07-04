<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSquadStore } from '../stores/squad'

const { t, locale } = useI18n()
const route = useRoute()
const store = useSquadStore()

const navItems = [
  { name: 'bureau', path: '/', label: 'nav.bureau', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { name: 'squad', path: '/squad', label: 'nav.squad', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
  { name: 'market', path: '/market', label: 'nav.market', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z' },
  { name: 'inventory', path: '/inventory', label: 'nav.inventory', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5a1.125 1.125 0 00-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' },
  { name: 'operation', path: '/operation', label: 'nav.operation', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
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
  return `H${hour} · ${phaseLabels[phase] || '...'}`
})

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function switchLanguage(lang) {
  locale.value = lang
  store.setLanguage(lang)
}

onMounted(() => {
  if (!store.sensei) store.fetchSquad()
})
</script>

<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Mobile header -->
    <div class="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 shadow-sm ring-1 ring-white/10 lg:hidden">
      <span class="text-lg font-bold text-white">🦅 Kage Legacy</span>
      <span class="ml-auto text-xs text-gray-400">{{ cycleLabel }}</span>
    </div>

    <!-- Sidebar layout (Tailwind UI: Sidebar + main) -->
    <div class="lg:flex lg:min-h-screen">
      <aside class="hidden w-72 shrink-0 flex-col bg-gray-900 ring-1 ring-white/10 lg:flex">
        <div class="flex h-16 shrink-0 items-center gap-2 px-6">
          <span class="text-xl">🦅</span>
          <span class="text-lg font-bold text-white">Kage Legacy</span>
        </div>

        <div class="mx-4 mb-4 rounded-lg bg-gray-800/50 px-3 py-2 ring-1 ring-white/10">
          <p class="text-[10px] font-medium uppercase tracking-wider text-gray-500">{{ t('bureau.cycle') }}</p>
          <p class="text-sm font-semibold text-indigo-300">{{ cycleLabel }}</p>
        </div>

        <nav class="flex flex-1 flex-col px-4">
          <ul class="flex flex-1 flex-col gap-y-1">
            <li v-for="item in navItems" :key="item.name">
              <router-link
                :to="item.path"
                class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold transition"
                :class="isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'"
              >
                <svg class="size-6 shrink-0" :class="isActive(item.path) ? 'text-white' : 'text-gray-500 group-hover:text-white'" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                </svg>
                {{ t(item.label) }}
              </router-link>
            </li>
          </ul>
        </nav>

        <div class="border-t border-white/10 p-4">
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition"
              :class="locale === 'fr' ? 'bg-white/10 text-white ring-white/20' : 'text-gray-400 ring-white/10 hover:bg-white/5'"
              @click="switchLanguage('fr')"
            >FR</button>
            <button
              class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition"
              :class="locale === 'en' ? 'bg-white/10 text-white ring-white/20' : 'text-gray-400 ring-white/10 hover:bg-white/5'"
              @click="switchLanguage('en')"
            >EN</button>
          </div>
        </div>
      </aside>

      <main class="flex-1">
        <!-- Mobile bottom nav -->
        <nav class="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-gray-900 lg:hidden">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            class="flex flex-1 flex-col items-center py-2 text-[10px]"
            :class="isActive(item.path) ? 'text-indigo-400' : 'text-gray-500'"
          >
            <svg class="mb-0.5 size-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            {{ t(item.label) }}
          </router-link>
        </nav>

        <div class="px-4 py-8 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
