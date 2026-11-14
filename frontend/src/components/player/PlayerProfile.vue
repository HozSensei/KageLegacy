<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PlayerStats from './PlayerStats.vue'

defineOptions({ name: 'PlayerProfile' })

const props = defineProps({
  character: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['specialize'])

const { t } = useI18n()

const xpProgress = computed(() => {
  const need = props.character.xpToNextLevel
  if (!need) return 100
  return Math.min(100, Math.round((props.character.xp / need) * 100))
})

const canSpecialize = computed(
  () => props.character.level >= 10 && !props.character.specialization
)

const specs = ['Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medicine']
</script>

<template>
  <div class="space-y-10" data-testid="player-profile">
    <section class="border border-line bg-bg-card p-6 sm:p-8">
      <p class="page-kicker">{{ character.rank }}</p>
      <h1 class="page-title mt-2">{{ character.name }}</h1>
      <p class="mt-2 text-sm text-ink-muted">
        {{ t('player.levelLabel', { level: character.level }) }}
        <span class="mx-2 text-ink-faint">·</span>
        {{ character.elementAffinity }}
        <template v-if="character.clanName">
          <span class="mx-2 text-ink-faint">·</span>
          {{ character.clanName }}
        </template>
        <template v-if="character.specialization">
          <span class="mx-2 text-ink-faint">·</span>
          {{ character.specialization }}
        </template>
      </p>

      <div class="mt-6">
        <div class="flex items-end justify-between text-xs text-ink-muted">
          <span>{{ t('player.xpLabel') }}</span>
          <span class="tabular-nums">
            <template v-if="character.xpToNextLevel != null">
              {{ character.xp }} / {{ character.xpToNextLevel }}
            </template>
            <template v-else>{{ t('player.maxLevel') }}</template>
          </span>
        </div>
        <div class="mt-2 h-2 overflow-hidden border border-line bg-bg-soft">
          <div
            class="h-full bg-accent transition-[width] duration-700 ease-out"
            :style="{ width: `${xpProgress}%` }"
          />
        </div>
      </div>

      <p class="mt-4 text-sm text-ink">
        {{ t('player.talentPoints', { count: character.talentPointsAvailable }) }}
      </p>
      <RouterLink to="/talents" class="btn-primary mt-4 inline-flex text-xs" data-testid="open-talents">
        {{ t('talents.openFromProfile') }}
      </RouterLink>
    </section>

    <PlayerStats :stats="character.stats" />

    <section v-if="canSpecialize" class="border border-line bg-bg-card p-6 sm:p-8" data-testid="specialization-picker">
      <h2 class="font-display text-xl text-ink">{{ t('player.specializationTitle') }}</h2>
      <p class="mt-1 text-sm text-ink-muted">{{ t('player.specializationLead') }}</p>
      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          v-for="spec in specs"
          :key="spec"
          type="button"
          class="border border-line px-4 py-3 text-left text-sm text-ink transition hover:border-accent hover:text-accent"
          @click="emit('specialize', spec)"
        >
          {{ t(`player.specs.${spec}`) }}
        </button>
      </div>
    </section>
  </div>
</template>
