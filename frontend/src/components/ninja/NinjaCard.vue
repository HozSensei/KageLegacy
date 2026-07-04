<script setup>
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNinjaDisplay } from '../../composables/useNinjaDisplay.js'

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
const { overall, elementTone, joninProgress, statKeys } = useNinjaDisplay(toRef(props, 'ninja'))

const firstName = computed(() => props.ninja.name.split(' ')[0])
const clanName = computed(() => props.ninja.name.split(' ').slice(1).join(' ') || props.ninja.clan_name)
</script>

<template>
  <!-- Pitch: minimal vertical card -->
  <button
    v-if="variant === 'pitch'"
    type="button"
    class="group w-28 text-left transition duration-300 focus:outline-none"
    :class="selected ? 'opacity-100' : 'opacity-90 hover:opacity-100'"
    @click="emit('select', ninja)"
  >
    <div
      class="border-t-2 pt-3 transition"
      :class="selected ? 'border-accent' : 'border-line group-hover:border-ink-faint'"
    >
      <p class="font-display text-3xl leading-none text-ink">{{ overall }}</p>
      <p class="mt-2 font-display text-lg leading-tight text-ink">{{ firstName }}</p>
      <p class="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{{ clanName }}</p>
      <p class="mt-2 text-[11px] uppercase tracking-[0.12em]" :class="elementTone">{{ ninja.element_affinity }}</p>
      <p v-if="slotLabel" class="mt-1 text-[10px] text-ink-faint/70">{{ slotLabel }}</p>
    </div>
  </button>

  <!-- Bench chip -->
  <button
    v-else-if="variant === 'bench'"
    type="button"
    class="shrink-0 border-t border-line px-4 py-3 text-left transition hover:border-ink-faint"
    :class="selected ? 'border-accent bg-bg-soft/50' : ''"
    @click="emit('select', ninja)"
  >
    <p class="font-display text-xl text-ink">{{ overall }}</p>
    <p class="mt-1 max-w-[7rem] truncate text-xs text-ink-muted">{{ ninja.name }}</p>
  </button>

  <!-- Full editorial card -->
  <article v-else class="flex flex-col">
    <div class="border-t border-line pt-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="font-display text-4xl leading-none text-ink">{{ overall }}</p>
          <h3 class="mt-3 font-display text-2xl leading-tight text-ink">{{ ninja.name }}</h3>
          <p class="mt-1 text-sm text-ink-muted">
            {{ ninja.age }} {{ t('ninja.age') }}
            <span class="mx-1.5 text-ink-faint">·</span>
            <span :class="elementTone">{{ ninja.element_affinity }}</span>
            <span class="mx-1.5 text-ink-faint">·</span>
            {{ t(`grades.${ninja.grade}`) }}
          </p>
        </div>
      </div>

      <p class="group relative mt-4 inline-block text-sm italic text-ink-muted">
        {{ t(`traits.${ninja.character_trait}.label`) }}
        <span
          class="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 border border-line bg-bg-card p-3 text-xs not-italic text-ink-muted shadow-2xl group-hover:block"
        >
          <span class="text-accent-soft">+</span> {{ t(`traits.${ninja.character_trait}.bonus`) }}
          <br />
          <span class="text-fire/80">−</span> {{ t(`traits.${ninja.character_trait}.malus`) }}
        </span>
      </p>

      <div class="mt-6 space-y-4">
        <div>
          <div class="flex justify-between text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            <span>{{ t('ninja.forme') }}</span>
            <span class="text-ink-muted">{{ t(`formes.${ninja.weekly_forme}`) }}</span>
          </div>
          <div class="mt-2 h-px bg-line">
            <div
              class="h-px bg-accent-soft transition-all"
              :style="{
                width: `${({ Lamentable: 25, Passable: 50, Excellent: 75, Divin: 100 })[ninja.weekly_forme] || 50}%`,
              }"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            <span>{{ t('ninja.moral') }}</span>
            <span class="text-ink-muted">{{ ninja.moral }}/20</span>
          </div>
          <div class="mt-2 h-px bg-line">
            <div class="h-px bg-ink-muted/50" :style="{ width: `${(ninja.moral / 20) * 100}%` }" />
          </div>
        </div>
        <div>
          <div class="flex justify-between text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            <span>{{ t('ninja.joninProgress') }}</span>
            <span class="text-ink-muted">{{ joninProgress }}%</span>
          </div>
          <div class="mt-2 h-px bg-line">
            <div class="h-px bg-accent/70" :style="{ width: `${joninProgress}%` }" />
          </div>
        </div>
      </div>

      <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-5">
        <div v-for="key in statKeys" :key="key" class="flex justify-between gap-2 text-sm">
          <dt class="text-ink-faint">{{ t(`ninja.stats.${key}`) }}</dt>
          <dd class="tabular-nums text-ink">{{ ninja[key] }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
