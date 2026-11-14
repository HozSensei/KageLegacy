<script setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'QuestList' })

defineProps({
  title: { type: String, required: true },
  quests: { type: Array, default: () => [] },
  locale: { type: String, default: 'fr' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['claim', 'stub-progress'])

const { t } = useI18n()

function description(quest, loc) {
  return loc?.startsWith('en') ? quest.descriptionEn : quest.descriptionFr
}

function pct(quest) {
  const goal = Math.max(1, quest.goalValue || 1)
  return Math.min(100, Math.round(((quest.progress?.current || 0) / goal) * 100))
}
</script>

<template>
  <section class="bp-quests" data-testid="quest-list">
    <h2 class="font-display text-xl text-ink">{{ title }}</h2>
    <p v-if="!quests.length" class="mt-3 text-sm text-ink-muted">{{ t('battlePass.noQuests') }}</p>

    <ul class="mt-4 space-y-3">
      <li
        v-for="quest in quests"
        :key="quest.id"
        class="bp-quest"
        :data-testid="`quest-${quest.questKey}`"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="text-sm text-ink">{{ description(quest, locale) }}</p>
            <p class="mt-1 text-xs text-ink-muted">
              {{ t('battlePass.questProgress', {
                current: quest.progress?.current || 0,
                goal: quest.goalValue,
              }) }}
              · {{ t('battlePass.questXp', { n: quest.xpReward }) }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="!quest.progress?.isCompleted"
              type="button"
              class="btn-ghost text-[10px]"
              :disabled="busy"
              @click="emit('stub-progress', quest)"
            >
              {{ t('battlePass.stubProgress') }}
            </button>
            <button
              v-else-if="!quest.progress?.isClaimed"
              type="button"
              class="btn-primary text-[10px]"
              :disabled="busy"
              :data-testid="`claim-quest-${quest.id}`"
              @click="emit('claim', quest.id)"
            >
              {{ t('battlePass.claimQuest') }}
            </button>
            <span v-else class="text-[10px] uppercase tracking-wide text-win">
              {{ t('battlePass.claimed') }}
            </span>
          </div>
        </div>
        <div class="bp-quest__bar mt-3" aria-hidden="true">
          <span class="bp-quest__fill" :style="{ width: `${pct(quest)}%` }" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bp-quest {
  padding: 0.85rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--kl-line-mix) 16%, transparent);
}

.bp-quest__bar {
  height: 3px;
  background: color-mix(in srgb, var(--kl-line-mix) 22%, transparent);
  overflow: hidden;
}

.bp-quest__fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--kl-accent), color-mix(in srgb, var(--kl-fire) 55%, var(--kl-accent)));
  transition: width 320ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .bp-quest__fill {
    transition: none;
  }
}
</style>
