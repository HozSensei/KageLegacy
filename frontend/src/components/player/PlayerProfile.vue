<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
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

const initial = computed(() =>
  String(props.character.name || '?')
    .trim()
    .charAt(0)
    .toUpperCase()
);
</script>

<template>
  <div class="profile" data-testid="player-profile">
    <section class="profile-id">
      <div class="profile-id__main">
        <span class="profile-id__avatar" aria-hidden="true">{{ initial }}</span>
        <div class="min-w-0">
          <p class="profile-id__rank">
            <span class="lozenge" aria-hidden="true" />
            {{ character.rank }}
          </p>
          <h2 class="profile-id__name">{{ character.name }}</h2>
          <p class="profile-id__tags">
            <span class="sr-only">{{ t('player.levelLabel', { level: character.level }) }}</span>

            <span
              v-if="character.factionId"
              class="profile-id__tag"
              :style="{
                borderLeft: `3px solid ${character.faction?.accentColor || 'currentColor'}`,
              }"
              data-testid="profile-faction"
            >
              {{ t(`factions.names.${character.factionId}`) }}
            </span>
          </p>
        </div>
      </div>
      <div class="profile-id__level" aria-hidden="true">
        <span class="profile-id__level-label">{{ t('player.levelWord') }}</span>
        <span class="profile-id__level-value">{{ character.level }}</span>
      </div>
    </section>

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

.profile-id {
  display: flex;
  align-items: stretch;
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
  animation: rise-in 480ms var(--ease-out-quint) both;
}

.profile-id__main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: clamp(1rem, 3vw, 1.75rem);
  padding: clamp(1.25rem, 4vw, 2.25rem);
}

.profile-id__avatar {
  display: grid;
  width: clamp(3.5rem, 9vw, 5.5rem);
  height: clamp(3.5rem, 9vw, 5.5rem);
  flex-shrink: 0;
  place-items: center;
  background: var(--color-on-fill);
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: var(--color-indigo-deep);
}

.profile-id__rank {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-on-fill-warm);
}

.profile-id__rank .lozenge {
  color: var(--color-vermilion);
}

.profile-id__name {
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  font-family: var(--font-display);
  font-size: var(--type-title);
  font-weight: 800;
  font-stretch: 78%;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--color-on-fill);
}

.profile-id__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.85rem;
}

.profile-id__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  background: color-mix(in srgb, var(--color-on-fill) 14%, transparent);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-on-fill);
}

.profile-id__level {
  display: flex;
  min-width: clamp(5.5rem, 18vw, 10rem);
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  padding: clamp(0.9rem, 2.5vw, 1.5rem);
  background: var(--color-vermilion);
  color: var(--color-on-fill);
}

.profile-id__level-label {
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.profile-id__level-value {
  font-family: var(--font-display);
  font-size: clamp(3.75rem, 2.5rem + 7vw, 8rem);
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 0.78;
  letter-spacing: -0.04em;
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

@media (max-width: 479px) {
  .profile-id {
    flex-direction: column;
  }

  .profile-id__level {
    flex-direction: row;
    align-items: flex-end;
  }
}
</style>
