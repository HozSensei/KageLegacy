<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePlayerStore } from '../stores/player';
import { useCollectionStore } from '../stores/collection';
import { useDecksStore } from '../stores/decks';
import { useTalentTreeStore } from '../stores/talentTree';

import { useAchievementsStore } from '../stores/achievements';
import EmptyState from '../components/ui/EmptyState.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { sectionOf } from '../constants/sections';
import hubImage from '../assets/illustrations/hub-office.webp';

defineOptions({ name: 'HubView' });

const { t } = useI18n();
const player = usePlayerStore();
const collection = useCollectionStore();
const decks = useDecksStore();
const talents = useTalentTreeStore();

const achievements = useAchievementsStore();
const ready = ref(false);
const progressLoadError = ref(false);

async function loadHub() {
  ready.value = false;
  progressLoadError.value = false;
  const [, , , talentData, achievementData] = await Promise.all([
    player.fetchPlayer(),
    collection.fetchCollection(),
    decks.fetchDecks(),
    talents.fetchMe(),
    achievements.fetchRegistry(),
  ]);
  progressLoadError.value = Boolean(decks.error || !talentData || !achievementData);
  ready.value = true;
}

onMounted(loadHub);

const hasCharacter = computed(() => Boolean(player.character));
const hasConfirmedCharacterAbsence = computed(() => player.hasConfirmedCharacterAbsence);
const hasPlayerLoadError = computed(() => player.characterState === 'error');
const cardCount = computed(() => collection.entries?.length || 0);

const activeDeck = computed(() => (decks.decks || []).find(d => d.isActive));
const talentPoints = computed(() => player.character?.talentPointsAvailable ?? 0);
const unlockedTalents = computed(() => talents.unlockedNodeIds?.length ?? 0);
const hasCompletedMission = computed(() =>
  achievements.achievements.some(a => a.key === 'mission_runs' && a.progress > 0)
);

const steps = computed(() => [
  {
    key: 'character',
    done: hasCharacter.value,
    label: t('hub.stepCharacter'),
    hint: t('hub.hintCharacter'),
    to: '/character-creation',
  },
  {
    key: 'deck',
    done: Boolean(activeDeck.value?.validation?.valid),
    label: t('hub.stepDeck'),
    hint: t('hub.hintDeck'),
    to: '/decks',
  },
  {
    key: 'talents',
    done: unlockedTalents.value > 0,
    label: t('hub.stepTalents'),
    hint: t('hub.hintTalents'),
    to: '/talents',
  },
  {
    key: 'mission',
    done: hasCompletedMission.value,
    label: t('hub.stepMission'),
    hint: t('hub.hintMission'),
    to: '/missions',
  },
]);

const nextStep = computed(() => steps.value.find(s => !s.done));

const shortcuts = computed(() =>
  [
    {
      name: 'missions',
      to: '/missions',
      label: t('nav.missions'),
      hint: t('hub.shortcutMissions'),
    },
    { name: 'talents', to: '/talents', label: t('nav.talents'), hint: t('hub.shortcutTalents') },
    { name: 'decks', to: '/decks', label: t('nav.decks'), hint: t('hub.shortcutDecks') },
    {
      name: 'collection',
      to: '/collection',
      label: t('nav.collection'),
      hint: t('hub.shortcutCollection'),
    },
    { name: 'shop', to: '/shop', label: t('nav.shop'), hint: t('hub.shortcutShop') },
    {
      name: 'battle-pass',
      to: '/battle-pass',
      label: t('nav.battlePass'),
      hint: t('hub.shortcutBp'),
    },
    { name: 'journal', to: '/journal', label: t('nav.journal'), hint: t('hub.shortcutJournal') },
    { name: 'pvp', to: '/pvp', label: t('nav.pvp'), hint: t('hub.shortcutPvp') },
    {
      name: 'leaderboard',
      to: '/classement',
      label: t('nav.leaderboard'),
      hint: t('hub.shortcutLeaderboard'),
    },
    { name: 'profile', to: '/profil', label: t('nav.profile'), hint: t('hub.shortcutProfile') },
  ].map(link => ({ ...link, section: sectionOf(link.name) }))
);
</script>

<template>
  <div class="page-shell" data-testid="hub-page">
    <PageHeader
      tone="vermilion"
      size="display"
      :kicker="t('hub.kicker')"
      :title="t('hub.title')"
      :lead="t('hub.lead')"
      :image="hubImage"
      image-position="50% 35%"
    >
      <template v-if="ready && hasCharacter && !progressLoadError && nextStep" #actions>
        <RouterLink :to="nextStep.to" class="btn-primary" data-testid="hub-hero-cta">
          {{ t('hub.continueCta', { step: nextStep.label }) }}
          <AppIcon name="arrow-right" size="1.125rem" :stroke-width="2" />
        </RouterLink>
      </template>
      <template v-else-if="ready && hasConfirmedCharacterAbsence" #actions>
        <RouterLink to="/character-creation" class="btn-primary" data-testid="hub-hero-create">
          {{ t('hub.createCharacter') }}
        </RouterLink>
      </template>
    </PageHeader>

    <p v-if="!ready" class="mt-10 text-ink-muted">{{ t('common.loading') }}</p>

    <template v-else>
      <EmptyState
        v-if="hasPlayerLoadError"
        class="mt-10"
        :title="t('hub.playerLoadErrorTitle')"
        :lead="t('hub.playerLoadErrorLead')"
        data-testid="hub-player-load-error"
      >
        <button class="btn-primary" type="button" :disabled="player.loading" @click="loadHub">
          {{ t('hub.retry') }}
        </button>
      </EmptyState>

      <EmptyState
        v-else-if="hasConfirmedCharacterAbsence"
        class="mt-10"
        :title="t('hub.noCharacterTitle')"
        :lead="t('hub.noCharacterLead')"
        primary-to="/character-creation"
        :primary-label="t('hub.createCharacter')"
      />

      <template v-else-if="hasCharacter">
        <section class="hub-welcome" data-testid="hub-welcome">
          <div class="hub-welcome__who">
            <p class="t-kicker hub-welcome__kicker">
              <span class="lozenge" aria-hidden="true" />
              {{ t('hub.welcomeBack') }}
            </p>
            <h2 class="hub-welcome__name">{{ player.character.name }}</h2>
            <p class="sr-only">
              {{ t('player.levelLabel', { level: player.character.level }) }} ·
              {{ t('hub.cardsOwned', { n: cardCount }) }}
              <template v-if="activeDeck">
                · {{ t('hub.activeDeck', { name: activeDeck.name }) }}</template
              >
            </p>
          </div>

          <dl class="hub-welcome__figures stagger" aria-hidden="true">
            <div class="hub-figure" data-tone="vermilion" style="--i: 0">
              <dt>{{ t('hub.statLevel') }}</dt>
              <dd class="figure figure--lg">{{ player.character.level }}</dd>
            </div>
            <div class="hub-figure" data-tone="wood" style="--i: 1">
              <dt>{{ t('hub.statCards') }}</dt>
              <dd class="figure figure--lg">{{ cardCount }}</dd>
            </div>
            <div class="hub-figure" data-tone="leaf" style="--i: 2">
              <dt>{{ t('hub.statTalentPoints') }}</dt>
              <dd class="figure figure--lg">{{ talentPoints }}</dd>
            </div>
            <div class="hub-figure hub-figure--text" data-tone="sky" style="--i: 3">
              <dt>{{ t('hub.statDeck') }}</dt>
              <dd>{{ activeDeck ? activeDeck.name : t('hub.noDeck') }}</dd>
            </div>
          </dl>
        </section>

        <div
          v-if="progressLoadError"
          class="alert alert--error mt-6"
          role="alert"
          data-testid="hub-progress-error"
        >
          <p>{{ t('hub.progressLoadError') }}</p>
          <button type="button" class="btn-ghost" @click="loadHub">{{ t('hub.retry') }}</button>
        </div>
        <section v-else class="page-section" data-testid="hub-checklist">
          <div class="section-head">
            <span class="section-head__index">02</span>
            <h2 class="section-head__title">{{ t('hub.nextSteps') }}</h2>
            <span class="section-head__rule" />
          </div>
          <p class="mt-3 text-ink-muted">{{ t('hub.nextStepsLead') }}</p>

          <ol class="hub-steps rule-list stagger">
            <li
              v-for="(step, index) in steps"
              :key="step.key"
              class="hub-step"
              :class="{ 'hub-step--done': step.done }"
              :style="{ '--i': index }"
            >
              <span class="hub-step__index" aria-hidden="true">{{ index + 1 }}</span>
              <div class="min-w-0">
                <p class="hub-step__label">{{ step.label }}</p>
                <p v-if="!step.done" class="hub-step__hint">{{ step.hint }}</p>
              </div>
              <RouterLink
                v-if="!step.done"
                :to="step.to"
                class="btn-ghost btn-sm shrink-0"
                :data-testid="`hub-step-${step.key}`"
              >
                {{ t('hub.go') }}
              </RouterLink>
              <span v-else class="hub-step__done">
                <AppIcon name="check" size="1rem" :stroke-width="2.5" />
                {{ t('hub.done') }}
              </span>
            </li>
          </ol>

          <RouterLink
            v-if="nextStep"
            :to="nextStep.to"
            class="btn-primary btn-lg mt-6"
            data-testid="hub-primary-cta"
          >
            {{ t('hub.continueCta', { step: nextStep.label }) }}
            <AppIcon name="arrow-right" size="1.125rem" :stroke-width="2" />
          </RouterLink>
        </section>

        <section class="page-section">
          <div class="section-head">
            <span class="section-head__index">03</span>
            <h2 class="section-head__title">{{ t('hub.shortcutsTitle') }}</h2>
            <span class="section-head__rule" />
          </div>

          <nav class="hub-shortcuts stagger" data-testid="hub-shortcuts">
            <RouterLink
              v-for="(link, index) in shortcuts"
              :key="link.to"
              :to="link.to"
              class="hub-tile"
              :data-tone="link.section.tone"
              :style="{ '--i': index }"
            >
              <span class="hub-tile__top">
                <span class="hub-tile__index">{{ link.section.index }}</span>
                <AppIcon :name="link.section.icon" size="1.375rem" class="hub-tile__icon" />
              </span>
              <span class="hub-tile__label">{{ link.label }}</span>
              <span class="hub-tile__hint">{{ link.hint }}</span>
            </RouterLink>
          </nav>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.hub-welcome {
  display: grid;
  gap: 1.75rem;
  margin-top: var(--space-block);
}

.hub-welcome__kicker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.hub-welcome__kicker .lozenge {
  color: var(--color-vermilion);
}

.hub-welcome__name {
  margin-top: 0.6rem;
  overflow-wrap: anywhere;
  font-size: clamp(2.5rem, 1.6rem + 4.5vw, 4.75rem);
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  letter-spacing: -0.025em;
}

.hub-welcome__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem 1.25rem;
}

.hub-figure {
  min-width: 0;
  padding-top: 0.7rem;
  border-top: 4px solid var(--tone-fill);
}

.hub-figure dt {
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.hub-figure dd {
  margin-top: 0.55rem;
}

.hub-figure--text dd {
  overflow-wrap: anywhere;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.1;
}

.hub-steps {
  margin-top: 1.5rem;
}

.hub-step {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  padding-block: 0.9rem;
}

.hub-step__index {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  color: var(--color-vermilion);
}

.hub-step__label {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
}

.hub-step__hint {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.hub-step--done .hub-step__index {
  color: var(--color-line-strong);
}

.hub-step--done .hub-step__label {
  font-weight: 500;
  color: var(--color-ink-faint);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}

.hub-step__done {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-leaf);
}

.hub-shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 1.5rem;
}

.hub-tile {
  display: flex;
  flex-direction: column;
  min-height: 8.5rem;
  padding: 0.9rem 1rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--tone-tint);
  color: var(--color-ink);
  text-decoration: none;
  transition:
    background-color var(--dur-base) ease,
    color var(--dur-base) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.hub-tile__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--tone);
  transition: color var(--dur-base) ease;
}

.hub-tile__index {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
}

.hub-tile__label {
  margin-top: auto;
  padding-top: 1.25rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.1;
}

.hub-tile__hint {
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
  transition: color var(--dur-base) ease;
}

.hub-tile:hover,
.hub-tile:focus-visible {
  background: var(--tone-fill);
  color: var(--tone-on);
  transform: translateY(-3px);
}

.hub-tile:hover .hub-tile__top,
.hub-tile:hover .hub-tile__hint,
.hub-tile:focus-visible .hub-tile__top,
.hub-tile:focus-visible .hub-tile__hint {
  color: var(--tone-on);
}

@media (min-width: 768px) {
  .hub-welcome {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
    gap: 3rem;
    align-items: end;
  }

  .hub-welcome__figures {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .hub-shortcuts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }
}
</style>
