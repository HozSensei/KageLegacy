<script setup>
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue'
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
const use3dFlip = ref(true)
const { overall, elementTone, elementLabel, joninProgress, statKeys, isNobleBloodline } = useNinjaDisplay(toRef(props, 'ninja'))

let hoverMedia

const firstName = computed(() => props.ninja.name.split(' ')[0])
const clanName = computed(() => props.ninja.clan_name || props.ninja.name.split(' ').slice(1).join(' '))

const sizeClass = computed(() => ({
  md: 'flip-scene-wrap--md',
  sm: 'flip-scene-wrap--sm',
  xs: 'flip-scene-wrap--xs',
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
  if (!use3dFlip.value) return 'none'
  return flipped.value ? 'rotateY(180deg)' : 'rotateY(0deg)'
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

onMounted(() => {
  hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)')
  use3dFlip.value = hoverMedia.matches
  hoverMedia.addEventListener('change', onHoverMediaChange)
})

onUnmounted(() => {
  hoverMedia?.removeEventListener('change', onHoverMediaChange)
})

function onHoverMediaChange(event) {
  use3dFlip.value = event.matches
}
</script>

<template>
  <div
    class="flip-scene-wrap"
    :class="[sizeClass, { 'flip-scene-wrap--chunin': isChunin, 'flip-scene-wrap--flat': !use3dFlip }]"
  >
    <div
      class="flip-scene"
      :class="{ 'flip-scene--noble': isNobleBloodline }"
      role="button"
      tabindex="0"
      @click="toggleFlip"
      @keydown.enter.prevent="toggleFlip"
      @keydown.space.prevent="toggleFlip"
    >
      <div
        class="flip-inner"
        :style="use3dFlip ? { transform: innerTransform } : undefined"
        :class="{ 'is-selected': selected, 'is-flipped': flipped && !use3dFlip }"
      >
        <!-- RECTO -->
        <div
          class="flip-face ninja-card-face"
          :class="[faceGradeClass, { 'flip-face--hidden': flipped && !use3dFlip }]"
        >
          <div class="flip-face__content">
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

            <div class="mt-auto min-w-0">
              <p class="font-display leading-tight text-ink" :class="size === 'xs' ? 'text-lg' : 'text-xl'">
                {{ firstName }}
              </p>
              <p class="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ clanName }}</p>
              <NinjaProfileBadges class="mt-2" :ninja="ninja" :compact="size === 'xs'" />
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
        <div
          class="flip-face flip-back ninja-card-face"
          :class="[faceGradeClass, { 'flip-face--hidden': !flipped && !use3dFlip }]"
        >
          <div class="flip-face__content flip-face__content--back">
            <p class="truncate font-display text-base text-ink">{{ ninja.name }}</p>
            <NinjaProfileBadges class="mt-2" :ninja="ninja" :compact="size === 'xs'" />

            <div class="trait-tooltip mt-2">
              <p class="italic leading-snug text-ink-muted">
                {{ t(`traits.${ninja.character_trait}.label`) }}
              </p>
              <div class="trait-tooltip__panel" role="tooltip">
                <p class="text-accent-soft">{{ t(`traits.${ninja.character_trait}.bonus`) }}</p>
                <p class="mt-1.5 text-ink-faint">{{ t(`traits.${ninja.character_trait}.malus`) }}</p>
              </div>
            </div>

            <dl class="mt-2 flex-1 space-y-1 text-[10px]">
              <div v-for="key in statKeys" :key="key" class="flex justify-between gap-2">
                <dt class="text-ink-faint">{{ t(`ninja.stats.${key}`) }}</dt>
                <dd class="tabular-nums font-medium text-ink">{{ ninja[key] }}</dd>
              </div>
            </dl>

            <div class="mt-2 space-y-1.5 border-t border-line/80 pt-2">
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
  </div>
</template>
