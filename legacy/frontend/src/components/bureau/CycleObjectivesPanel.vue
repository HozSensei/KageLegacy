<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const store = useSquadStore()

const objectives = computed(() => store.cycleObjectives?.objectives || [])
</script>

<template>
  <section
    v-if="objectives.length"
    class="mt-10 border border-line px-5 py-4"
    data-testid="cycle-objectives"
  >
    <p class="section-label">{{ t('cycleObjectives.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('cycleObjectives.lead') }}</p>

    <ul class="mt-5 space-y-4">
      <li v-for="obj in objectives" :key="obj.key" class="text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <span :class="obj.completed ? 'text-ink-faint line-through' : 'text-ink'">
            {{ obj.label }}
          </span>
          <span class="shrink-0 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            {{ obj.progress }}/{{ obj.target }}
            <template v-if="obj.completed"> · {{ t('cycleObjectives.reward', { ryos: obj.rewardRyos }) }}</template>
          </span>
        </div>
        <div class="mt-2 h-1 bg-line">
          <div
            class="h-1 bg-accent transition-all"
            :style="{ width: `${Math.min(100, Math.round((obj.progress / Math.max(1, obj.target)) * 100))}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>
