<script setup>
import { useI18n } from 'vue-i18n'
import AppIcon from '../ui/AppIcon.vue'

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
    <div class="section-head">
      <h2 class="section-head__title">{{ title }}</h2>
      <span class="section-head__rule" aria-hidden="true" />
    </div>
    <p v-if="!quests.length" class="mt-3 text-ink-muted">{{ t('battlePass.noQuests') }}</p>

    <ul class="bp-quests__list">
      <li
        v-for="quest in quests"
        :key="quest.id"
        class="bp-quest"
        :class="{
          'bp-quest--ready': quest.progress?.isCompleted && !quest.progress?.isClaimed,
          'bp-quest--done': quest.progress?.isClaimed,
        }"
        :data-tone="quest.progress?.isCompleted ? 'leaf' : 'gold'"
        :data-testid="`quest-${quest.questKey}`"
      >
        <div class="bp-quest__main">
          <div class="min-w-0">
            <p class="bp-quest__desc">{{ description(quest, locale) }}</p>
            <p class="bp-quest__meta">
              <span class="bp-quest__count">
                {{ t('battlePass.questProgress', {
                  current: quest.progress?.current || 0,
                  goal: quest.goalValue,
                }) }}
              </span>
              <span class="badge">{{ t('battlePass.questXp', { n: quest.xpReward }) }}</span>
            </p>
          </div>
          <div class="bp-quest__action">
            <button
              v-if="!quest.progress?.isCompleted"
              type="button"
              class="btn-ghost btn-sm"
              :disabled="busy"
              @click="emit('stub-progress', quest)"
            >
              {{ t('battlePass.stubProgress') }}
            </button>
            <button
              v-else-if="!quest.progress?.isClaimed"
              type="button"
              class="btn-primary btn-sm"
              :disabled="busy"
              :data-testid="`claim-quest-${quest.id}`"
              @click="emit('claim', quest.id)"
            >
              {{ t('battlePass.claimQuest') }}
            </button>
            <span v-else class="bp-quest__claimed">
              <AppIcon name="check" size="0.95rem" :stroke-width="2.5" />
              {{ t('battlePass.claimed') }}
            </span>
          </div>
        </div>
        <div class="meter meter--thin" aria-hidden="true">
          <span class="meter__fill" :style="{ width: `${pct(quest)}%` }" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bp-quests__list {
  display: flex;
  flex-direction: column;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.bp-quest {
  padding: 0.9rem 0 1rem;
}

.bp-quest + .bp-quest {
  border-top: 1px solid var(--color-line);
}

.bp-quest__main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.7rem;
}

.bp-quest__desc {
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-ink);
}

.bp-quest__meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

.bp-quest__count {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.bp-quest__claimed {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-leaf);
}

.bp-quest--done .bp-quest__desc {
  font-weight: 500;
  color: var(--color-ink-muted);
}
</style>
