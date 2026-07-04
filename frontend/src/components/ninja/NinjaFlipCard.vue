<script setup>
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNinjaDisplay } from '../../composables/useNinjaDisplay.js'

const props = defineProps({
  ninja: { type: Object, required: true },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['md', 'sm', 'xs'].includes(v),
  },
  selected: { type: Boolean, default: false },
  slotLabel: { type: String, default: '' },
})

const emit = defineEmits(['select', 'flip'])

const { t } = useI18n()
const flipped = ref(false)
const { overall, elementTone, joninProgress, statKeys } = useNinjaDisplay(toRef(props, 'ninja'))

const firstName = computed(() => props.ninja.name.split(' ')[0])
const clanName = computed(() => props.ninja.clan_name || props.ninja.name.split(' ').slice(1).join(' '))

const sizeClass = computed(() => ({
  md: 'h-[17.5rem] w-[11.5rem]',
  sm: 'h-[14rem] w-[9.5rem]',
  xs: 'h-[11rem] w-[7.5rem]',
}[props.size]))

const ratingSize = computed(() => ({
  md: 'text-5xl',
  sm: 'text-4xl',
  xs: 'text-3xl',
}[props.size]))

const formePercent = computed(() => ({
  Lamentable: 25,
  Passable: 50,
  Excellent: 75,
  Divin: 100,
}[props.ninja.weekly_forme] || 50))

function toggleFlip() {
  flipped.value = !flipped.value
  emit('select', props.ninja)
  emit('flip', { ninja: props.ninja, flipped: flipped.value })
}

function gradeColor(grade) {
  return { Genin: 'text-accent-soft', Chunin: 'text-water', Jonin: 'text-accent' }[grade] || 'text-ink-muted'
}
</script>

<template>
  <div
    class="flip-scene shrink-0 cursor-pointer transition duration-300"
    :class="[sizeClass, selected ? 'scale-[1.03]' : 'hover:scale-[1.02]']"
    :title="flipped ? 'Retourner' : 'Voir les détails'"
    @click="toggleFlip"
  >
    <div class="flip-inner h-full w-full" :class="{ 'is-flipped': flipped }">
      <!-- RECTO -->
      <div class="flip-face ninja-card-face relative p-3 sm:p-4" :class="selected ? 'ring-2 ring-accent/60' : ''">
        <div class="relative z-10 flex h-full flex-col">
          <!-- En-tête carte -->
          <div class="flex items-start justify-between">
            <span class="font-display leading-none text-ink" :class="ratingSize">{{ overall }}</span>
            <span class="text-[9px] uppercase tracking-[0.16em]" :class="gradeColor(ninja.grade)">
              {{ t(`grades.${ninja.grade}`) }}
            </span>
          </div>

          <!-- Corps -->
          <div class="mt-auto">
            <p class="font-display leading-tight text-ink" :class="size === 'xs' ? 'text-lg' : 'text-xl'">
              {{ firstName }}
            </p>
            <p class="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ clanName }}</p>
            <p class="mt-2 text-[10px] uppercase tracking-[0.12em]" :class="elementTone">{{ ninja.element_affinity }}</p>
            <p v-if="slotLabel" class="mt-1 text-[9px] text-ink-faint/80">{{ slotLabel }}</p>
          </div>

          <!-- Mini jauges recto -->
          <div v-if="size !== 'xs'" class="mt-3 space-y-1.5 border-t border-line/80 pt-2">
            <div class="flex justify-between text-[8px] uppercase tracking-wider text-ink-faint">
              <span>{{ t('ninja.forme') }}</span>
              <span class="text-ink-muted">{{ t(`formes.${ninja.weekly_forme}`).slice(0, 4) }}</span>
            </div>
            <div class="h-px bg-line"><div class="h-px bg-accent-soft/80" :style="{ width: `${formePercent}%` }" /></div>
          </div>

          <p class="mt-2 text-center text-[8px] uppercase tracking-[0.2em] text-ink-faint/60">
            Retourner
          </p>
        </div>

        <!-- Coin décoratif -->
        <div class="pointer-events-none absolute bottom-2 right-2 size-6 border border-line/50" />
      </div>

      <!-- VERSO -->
      <div class="flip-face flip-back ninja-card-face relative p-3 sm:p-4">
        <div class="relative z-10 flex h-full flex-col text-[10px]">
          <p class="text-[9px] uppercase tracking-[0.18em] text-ink-faint">Fiche ninja</p>
          <p class="mt-1 truncate font-display text-base text-ink">{{ ninja.name }}</p>

          <p class="mt-2 italic leading-snug text-ink-muted">
            {{ t(`traits.${ninja.character_trait}.label`) }}
          </p>

          <dl class="mt-3 flex-1 space-y-1">
            <div v-for="key in statKeys" :key="key" class="flex justify-between gap-1">
              <dt class="text-ink-faint">{{ t(`ninja.stats.${key}`).slice(0, 4) }}</dt>
              <dd class="tabular-nums font-medium text-ink">{{ ninja[key] }}</dd>
            </div>
          </dl>

          <div class="mt-2 space-y-1.5 border-t border-line/80 pt-2">
            <div class="flex justify-between text-[8px] uppercase tracking-wider text-ink-faint">
              <span>{{ t('ninja.moral') }}</span>
              <span>{{ ninja.moral }}/20</span>
            </div>
            <div class="h-px bg-line"><div class="h-px bg-ink-muted/50" :style="{ width: `${(ninja.moral / 20) * 100}%` }" /></div>
            <div class="flex justify-between text-[8px] uppercase tracking-wider text-ink-faint">
              <span>Jonin</span>
              <span>{{ joninProgress }}%</span>
            </div>
            <div class="h-px bg-line"><div class="h-px bg-accent/70" :style="{ width: `${joninProgress}%` }" /></div>
          </div>

          <p class="mt-2 text-center text-[8px] uppercase tracking-[0.2em] text-ink-faint/60">
            Recto
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
