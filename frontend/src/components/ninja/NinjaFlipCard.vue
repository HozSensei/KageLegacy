<script setup>
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNinjaDisplay } from '../../composables/useNinjaDisplay.js'
import NinjaProfileBadges from './NinjaProfileBadges.vue'

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
const hovered = ref(false)
const { overall, elementTone, elementLabel, joninProgress, statKeys, isNobleBloodline } = useNinjaDisplay(toRef(props, 'ninja'))

const TILT = 16

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

const innerTransform = computed(() => {
  if (flipped.value) {
    return hovered.value ? `rotateY(${180 - TILT}deg)` : 'rotateY(180deg)'
  }
  return hovered.value ? `rotateY(${TILT}deg)` : 'rotateY(0deg)'
})

function toggleFlip() {
  flipped.value = !flipped.value
  emit('select', props.ninja)
  emit('flip', { ninja: props.ninja, flipped: flipped.value })
}

const isChunin = computed(() => props.ninja.grade === 'Chunin')
const isGenin = computed(() => props.ninja.grade === 'Genin')

const faceGradeClass = computed(() => ({
  'ninja-card-face--chunin': isChunin.value,
  'ninja-card-face--genin': isGenin.value,
}))

function gradeColor(grade) {
  return { Genin: 'text-ink-faint', Chunin: 'text-accent', Jonin: 'text-accent' }[grade] || 'text-ink-muted'
}
</script>

<template>
  <div
    class="flip-scene shrink-0 cursor-pointer"
    :class="[sizeClass, { 'flip-scene--chunin': isChunin, 'flip-scene--noble': isNobleBloodline }]"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @click="toggleFlip"
  >
    <div
      class="flip-inner h-full w-full"
      :style="{ transform: innerTransform }"
      :class="{ 'is-selected': selected }"
    >
      <!-- RECTO -->
      <div class="flip-face ninja-card-face relative p-3 sm:p-4" :class="faceGradeClass">
        <div class="relative z-10 flex h-full flex-col">
          <div class="flex items-start justify-between gap-2">
            <span class="font-display leading-none text-ink" :class="ratingSize">{{ overall }}</span>
            <span
              class="uppercase tracking-[0.16em]"
              :class="[
                gradeColor(ninja.grade),
                isChunin ? 'text-[11px] font-medium' : 'text-[9px]',
              ]"
            >
              {{ t(`grades.${ninja.grade}`) }}
            </span>
          </div>

          <div class="mt-auto">
            <p class="font-display leading-tight text-ink" :class="size === 'xs' ? 'text-lg' : 'text-xl'">
              {{ firstName }}
            </p>
            <p class="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ clanName }}</p>
            <NinjaProfileBadges class="mt-2" :ninja="ninja" compact />
            <p class="mt-2 text-[10px] uppercase tracking-[0.12em]" :class="elementTone">{{ t(elementLabel) }}</p>
            <p v-if="slotLabel" class="mt-1 text-[9px] text-ink-faint/80">{{ slotLabel }}</p>
          </div>

          <div v-if="size !== 'xs'" class="mt-3 space-y-1.5 border-t border-line/80 pt-2">
            <div class="flex justify-between gap-2 text-[9px] uppercase tracking-wider text-ink-faint">
              <span>{{ t('ninja.forme') }}</span>
              <span class="text-right text-ink-muted">{{ t(`formes.${ninja.weekly_forme}`) }}</span>
            </div>
            <div class="h-px bg-line">
              <div class="h-px bg-accent-soft/80" :style="{ width: `${formePercent}%` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- VERSO -->
      <div class="flip-face flip-back ninja-card-face relative p-3 sm:p-4" :class="faceGradeClass">
        <div class="relative z-10 flex h-full flex-col text-[10px]">
          <p class="truncate font-display text-base text-ink">{{ ninja.name }}</p>
          <NinjaProfileBadges class="mt-2" :ninja="ninja" />

          <div class="trait-tooltip mt-3">
            <p class="italic leading-snug text-ink-muted">
              {{ t(`traits.${ninja.character_trait}.label`) }}
            </p>
            <div class="trait-tooltip__panel" role="tooltip">
              <p class="text-accent-soft">{{ t(`traits.${ninja.character_trait}.bonus`) }}</p>
              <p class="mt-1.5 text-ink-faint">{{ t(`traits.${ninja.character_trait}.malus`) }}</p>
            </div>
          </div>

          <dl class="mt-3 flex-1 space-y-1.5">
            <div v-for="key in statKeys" :key="key" class="flex justify-between gap-2">
              <dt class="text-ink-faint">{{ t(`ninja.stats.${key}`) }}</dt>
              <dd class="tabular-nums font-medium text-ink">{{ ninja[key] }}</dd>
            </div>
          </dl>

          <div class="mt-2 space-y-2 border-t border-line/80 pt-2">
            <div class="flex justify-between text-[9px] uppercase tracking-wider text-ink-faint">
              <span>{{ t('ninja.moral') }}</span>
              <span class="text-ink-muted">{{ ninja.moral }}/20</span>
            </div>
            <div class="h-px bg-line">
              <div class="h-px bg-ink-muted/50" :style="{ width: `${(ninja.moral / 20) * 100}%` }" />
            </div>
            <div class="flex justify-between text-[9px] uppercase tracking-wider text-ink-faint">
              <span>{{ t('ninja.joninProgress') }}</span>
              <span class="text-ink-muted">{{ joninProgress }}%</span>
            </div>
            <div class="h-px bg-line">
              <div class="h-px bg-accent/70" :style="{ width: `${joninProgress}%` }" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
