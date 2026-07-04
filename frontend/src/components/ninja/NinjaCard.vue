<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  ninja: { type: Object, required: true },
})

const { t } = useI18n()

const gradeClass = computed(() => ({
  Genin: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  Chunin: 'bg-blue-900/60 text-blue-300 border-blue-700',
  Jonin: 'bg-purple-900/60 text-purple-300 border-purple-700',
}[props.ninja.grade] || 'bg-slate-800 text-slate-300'))

const elementClass = computed(() => ({
  Katon: 'text-red-400',
  Suiton: 'text-blue-400',
  Raiton: 'text-yellow-300',
  Doton: 'text-amber-600',
  Futon: 'text-emerald-400',
}[props.ninja.element_affinity] || 'text-slate-300'))

const formePercent = computed(() => ({
  Lamentable: 25,
  Passable: 50,
  Excellent: 75,
  Divin: 100,
}[props.ninja.weekly_forme] || 50))

const formeColor = computed(() => ({
  Lamentable: 'bg-red-500',
  Passable: 'bg-yellow-500',
  Excellent: 'bg-lime-500',
  Divin: 'bg-emerald-400',
}[props.ninja.weekly_forme] || 'bg-yellow-500'))

const joninProgress = computed(() => {
  const combatStats = [props.ninja.taijutsu, props.ninja.ninjutsu, props.ninja.genjutsu, props.ninja.medecine]
  const maxStat = Math.max(...combatStats)
  return Math.min(100, Math.round((maxStat / 20) * 100))
})

const statKeys = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence']

const clanBoostedStats = computed(() => {
  const boosts = new Set()
  const clan = props.ninja.clan_name
  if (clan === 'Nara') boosts.add('intelligence')
  if (clan === 'Uchiwa') { boosts.add('genjutsu'); boosts.add('ninjutsu') }
  if (clan === 'Hyuga') { boosts.add('intelligence'); boosts.add('vitesse') }
  return boosts
})
</script>

<template>
  <article class="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
    <header class="mb-3 flex items-start justify-between gap-2">
      <div>
        <h3 class="font-semibold text-slate-100">{{ ninja.name }}</h3>
        <p class="text-xs text-slate-400">
          {{ ninja.age }} {{ t('ninja.age') }}
          <span class="mx-1">·</span>
          <span :class="elementClass">{{ ninja.element_affinity }}</span>
          <span class="mx-1">·</span>
          {{ ninja.clan_name }}
        </p>
      </div>
      <span class="rounded border px-2 py-0.5 text-xs font-medium" :class="gradeClass">
        {{ t(`grades.${ninja.grade}`) }}
      </span>
    </header>

    <div class="group relative mb-3 inline-flex w-fit items-center gap-1 text-xs text-amber-300">
      <span>⚠</span>
      <span class="font-medium">{{ t(`traits.${ninja.character_trait}.label`) }}</span>
      <div class="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded border border-slate-700 bg-zinc-900 p-2 text-slate-300 shadow-xl group-hover:block">
        <p class="mb-1 text-emerald-400">+ {{ t(`traits.${ninja.character_trait}.bonus`) }}</p>
        <p class="text-red-400">− {{ t(`traits.${ninja.character_trait}.malus`) }}</p>
      </div>
    </div>

    <div class="mb-3 space-y-2 text-xs">
      <div>
        <div class="mb-0.5 flex justify-between text-slate-400">
          <span>{{ t('ninja.forme') }}</span>
          <span>{{ t(`formes.${ninja.weekly_forme}`) }}</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-800">
          <div class="h-full rounded-full transition-all" :class="formeColor" :style="{ width: `${formePercent}%` }" />
        </div>
      </div>
      <div>
        <div class="mb-0.5 flex justify-between text-slate-400">
          <span>{{ t('ninja.moral') }}</span>
          <span>{{ ninja.moral }}/20</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-800">
          <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${(ninja.moral / 20) * 100}%` }" />
        </div>
      </div>
      <div>
        <div class="mb-0.5 flex justify-between text-slate-400">
          <span>{{ t('ninja.joninProgress') }}</span>
          <span>{{ joninProgress }}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-800">
          <div class="h-full rounded-full bg-orange-500/80" :style="{ width: `${joninProgress}%` }" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      <div v-for="key in statKeys" :key="key" class="flex items-center justify-between gap-1">
        <span class="text-slate-400">{{ t(`ninja.stats.${key}`) }}</span>
        <span :class="clanBoostedStats.has(key) ? 'font-semibold text-emerald-400' : 'text-slate-200'">
          {{ ninja[key] }}
          <span v-if="clanBoostedStats.has(key)" class="text-[10px]">★</span>
        </span>
      </div>
    </div>
  </article>
</template>
