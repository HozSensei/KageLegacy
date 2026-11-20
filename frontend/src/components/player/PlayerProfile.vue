<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PlayerAppearanceEditor from './PlayerAppearanceEditor.vue';
import PlayerStats from './PlayerStats.vue';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'PlayerProfile' });

const props = defineProps({
  character: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();

const xpProgress = computed(() => {
  const need = props.character.xpToNextLevel;
  if (!need) return 100;
  return Math.min(100, Math.round((props.character.xp / need) * 100));
});
</script>

<template>
  <div class="profile" data-testid="player-profile">
    <PlayerAppearanceEditor :character="character" />

    <section class="profile-progress">
      <div class="profile-progress__xp">
        <div class="profile-progress__row">
          <span class="t-kicker">{{ t('player.xpLabel') }}</span>
          <span class="profile-progress__num">
            <template v-if="character.xpToNextLevel != null">
              <strong>{{ character.xp }}</strong> / {{ character.xpToNextLevel }}
            </template>
            <template v-else>{{ t('player.maxLevel') }}</template>
          </span>
        </div>
        <div class="meter meter--thick" data-tone="vermilion">
          <div class="meter__fill profile-progress__fill" :style="{ width: `${xpProgress}%` }" />
        </div>
      </div>

      <p class="profile-progress__points" :class="{ 'is-empty': !character.talentPointsAvailable }">
        <span class="profile-progress__points-value">{{ character.talentPointsAvailable }}</span>
        <span>{{
          t('player.talentPoints', { count: character.talentPointsAvailable }).replace(
            /^\d+\s*/,
            ''
          )
        }}</span>
      </p>

      <nav class="profile-progress__actions" :aria-label="t('player.actionsLabel')">
        <RouterLink to="/talents" class="btn-primary" data-testid="open-talents">
          {{ t('talents.openFromProfile') }}
          <AppIcon name="arrow-right" size="1rem" />
        </RouterLink>
        <RouterLink to="/missions" class="btn-ghost" data-testid="open-missions">
          {{ t('player.openMissions') }}
        </RouterLink>
        <RouterLink to="/decks" class="btn-ghost" data-testid="open-decks">
          {{ t('player.openDecks') }}
        </RouterLink>
      </nav>
    </section>

    <PlayerStats :stats="character.stats" />
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 4vw, 3rem);
}

.profile-progress {
  display: grid;
  gap: 1.5rem 3rem;
  align-items: end;
}

@media (min-width: 900px) {
  .profile-progress {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .profile-progress__actions {
    grid-column: 1 / -1;
  }
}

.profile-progress__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.profile-progress__num {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
}

.profile-progress__num strong {
  font-size: 2rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  color: var(--color-ink);
}

.profile-progress__fill {
  transform-origin: left;
  animation: bar-grow 800ms var(--ease-out-quint) 200ms backwards;
}

.profile-progress__points {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 16rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-ink);
}

.profile-progress__points-value {
  display: grid;
  min-width: 3.25rem;
  height: 3.25rem;
  flex-shrink: 0;
  place-items: center;
  padding: 0 0.5rem;
  background: var(--color-leaf-fill);
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: var(--color-on-leaf);
}

.profile-progress__points.is-empty .profile-progress__points-value {
  background: var(--color-bg-soft);
  color: var(--color-ink-muted);
}

.profile-progress__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
</style>
