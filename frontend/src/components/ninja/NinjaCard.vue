<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from '../ui/Badge.vue'

const props = defineProps({
  ninja: { type: Object, required: true },
  variant: {
    type: String,
    default: 'full',
    validator: (v) => ['full', 'pitch', 'bench'].includes(v),
  },
  selected: { type: Boolean, default: false },
  slotLabel: { type: String, default: '' },
})

const emit = defineEmits(['select'])
const { t } = useI18n()

const overallRating = computed(() => {
  const s = props.ninja
  return Math.round((s.taijutsu + s.ninjutsu + s.genjutsu + s.medecine + s.vitesse + s.intelligence) / 6)
})

const elementColor = computed(() => ({
  Katon: 'text-red-400',
  Suiton: 'text-sky-400',
  Raiton: 'text-yellow-300',
  Doton: 'text-amber-500',
  Futon: 'text-emerald-400',
}[props.ninja.element_affinity]))

const gradeBadgeColor = computed(() => ({
  Genin: 'green',
  Chunin: 'blue',
  Jonin: 'purple',
}[props.ninja.grade] || 'gray'))

const formePercent = computed(() => ({
  Lamentable: 25,
  Passable: 50,
  Excellent: 75,
  Divin: 100,
}[props.ninja.weekly_forme] || 50))

const joninProgress = computed(() => {
  const combat = [props.ninja.taijutsu, props.ninja.ninjutsu, props.ninja.genjutsu, props.ninja.medecine]
  return Math.min(100, Math.round((Math.max(...combat) / 20) * 100))
})

const statKeys = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence']

const clanBoosted = computed(() => {
  const boosts = new Set()
  const clan = props.ninja.clan_name
  if (clan === 'Nara') boosts.add('intelligence')
  if (clan === 'Uchiwa') { boosts.add('genjutsu'); boosts.add('ninjutsu') }
  if (clan === 'Hyuga') { boosts.add('intelligence'); boosts.add('vitesse') }
  return boosts
})

const gauges = computed(() => [
  { key: 'forme', label: t('ninja.forme'), value: t(`formes.${props.ninja.weekly_forme}`), percent: formePercent.value, bar: formePercent.value <= 25 ? 'bg-red-500' : formePercent.value <= 50 ? 'bg-yellow-500' : formePercent.value <= 75 ? 'bg-lime-500' : 'bg-emerald-400' },
  { key: 'moral', label: t('ninja.moral'), value: `${props.ninja.moral}/20`, percent: (props.ninja.moral / 20) * 100, bar: 'bg-indigo-500' },
  { key: 'jonin', label: t('ninja.joninProgress'), value: `${joninProgress.value}%`, percent: joninProgress.value, bar: 'bg-orange-500' },
])
</script>

<template>
  <button
    v-if="variant === 'pitch'"
    type="button"
    class="group relative w-36 text-left transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    :class="selected ? 'scale-105' : ''"
    @click="emit('select', ninja)"
  >
    <div
      class="overflow-hidden rounded-lg bg-gray-900 shadow-lg ring-2 transition"
      :class="selected ? 'ring-indigo-400' : 'ring-white/20 group-hover:ring-white/40'"
    >
      <div class="bg-gradient-to-b from-gray-800 to-gray-900 px-3 pb-2 pt-3">
        <div class="flex items-start justify-between">
          <span class="text-2xl font-bold text-white">{{ overallRating }}</span>
          <Badge :color="gradeBadgeColor" class="text-[10px]">{{ t(`grades.${ninja.grade}`) }}</Badge>
        </div>
        <p class="mt-1 truncate text-sm font-semibold text-white">{{ ninja.name.split(' ')[0] }}</p>
        <p class="truncate text-[10px] text-gray-400">{{ ninja.clan_name }}</p>
      </div>
      <div class="border-t border-white/10 bg-gray-950/80 px-3 py-2">
        <p class="text-[10px] font-medium" :class="elementColor">{{ ninja.element_affinity }}</p>
        <p v-if="slotLabel" class="text-[10px] text-gray-500">{{ slotLabel }}</p>
      </div>
    </div>
  </button>

  <button
    v-else-if="variant === 'bench'"
    type="button"
    class="w-28 shrink-0 text-left transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    :class="selected ? 'opacity-100' : 'opacity-80'"
    @click="emit('select', ninja)"
  >
    <div class="rounded-md bg-gray-800/90 p-2 ring-1 transition" :class="selected ? 'ring-indigo-400' : 'ring-white/10'">
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-white">{{ overallRating }}</span>
        <span class="text-[9px] text-gray-400">{{ ninja.grade.slice(0, 3) }}</span>
      </div>
      <p class="truncate text-xs font-medium text-gray-200">{{ ninja.name }}</p>
      <p class="text-[10px]" :class="elementColor">{{ ninja.element_affinity }}</p>
    </div>
  </button>

  <article v-else class="overflow-hidden rounded-lg bg-gray-800/50 shadow-sm ring-1 ring-white/10">
    <div class="border-b border-white/10 bg-gray-900/50 px-4 py-4 sm:px-6">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="text-2xl font-bold text-white">{{ overallRating }}</span>
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-white">{{ ninja.name }}</h3>
            <p class="text-sm text-gray-400">
              {{ ninja.age }} {{ t('ninja.age') }} ·
              <span :class="elementColor">{{ ninja.element_affinity }}</span> ·
              {{ ninja.clan_name }}
            </p>
          </div>
        </div>
        <Badge :color="gradeBadgeColor">{{ t(`grades.${ninja.grade}`) }}</Badge>
      </div>
      <div class="group relative mt-3 inline-flex items-center gap-1.5 text-sm text-amber-300">
        <svg class="size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <span>{{ t(`traits.${ninja.character_trait}.label`) }}</span>
        <div class="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-md bg-gray-900 p-3 text-xs text-gray-300 shadow-lg ring-1 ring-white/10 group-hover:block">
          <p class="text-green-400">+ {{ t(`traits.${ninja.character_trait}.bonus`) }}</p>
          <p class="mt-1 text-red-400">− {{ t(`traits.${ninja.character_trait}.malus`) }}</p>
        </div>
      </div>
    </div>

    <div class="px-4 py-4 sm:px-6">
      <dl class="space-y-3">
        <div v-for="g in gauges" :key="g.key">
          <div class="flex items-center justify-between text-xs">
            <dt class="font-medium text-gray-400">{{ g.label }}</dt>
            <dd class="text-gray-300">{{ g.value }}</dd>
          </div>
          <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-700">
            <div class="h-full rounded-full" :class="g.bar" :style="{ width: `${g.percent}%` }" />
          </div>
        </div>
      </dl>

      <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div v-for="key in statKeys" :key="key" class="flex justify-between text-sm">
          <span class="text-gray-400">{{ t(`ninja.stats.${key}`) }}</span>
          <span :class="clanBoosted.has(key) ? 'font-semibold text-emerald-400' : 'text-white'">
            {{ ninja[key] }}<span v-if="clanBoosted.has(key)" class="text-xs"> ★</span>
          </span>
        </div>
      </div>
    </div>
  </article>
</template>
