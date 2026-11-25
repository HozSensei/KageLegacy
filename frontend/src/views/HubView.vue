<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePlayerStore } from '../stores/player';
import { useCollectionStore } from '../stores/collection';
import { useDecksStore } from '../stores/decks';
import { useTalentTreeStore } from '../stores/talentTree';

import { useAchievementsStore } from '../stores/achievements';
import { useOnboardingStore } from '../stores/onboarding';
import { useBattlePassStore } from '../stores/battlePass';
import { useShopStore } from '../stores/shop';
import EmptyState from '../components/ui/EmptyState.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import QuestList from '../components/battlePass/QuestList.vue';
import { sectionOf } from '../constants/sections';
import { useNotificationsStore } from '../stores/notifications.js';
import { ninjaProfileStats } from '../utils/ninjaProfile.js';
import { statVisual } from '../utils/statIcons.js';
import hubImage from '../assets/illustrations/hub-office.webp';

defineOptions({ name: 'HubView' });

const { t, locale, n } = useI18n();
const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const collection = useCollectionStore();
const decks = useDecksStore();
const talents = useTalentTreeStore();

const achievements = useAchievementsStore();
const onboarding = useOnboardingStore();
const battlePass = useBattlePassStore();
const shop = useShopStore();
const notifications = useNotificationsStore();
const ready = ref(false);
const progressLoadError = ref(false);
const claimMessage = ref(null);
const hubTab = ref('guide');

const HUB_STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'maxHp',
  'maxChakra',
  'armor',
];

async function loadHub() {
  ready.value = false;
  progressLoadError.value = false;
  claimMessage.value = null;
  const [, , , talentData, achievementData, onboardingData] = await Promise.all([
    player.fetchPlayer(),
    collection.fetchCollection(),
    decks.fetchDecks(),
    talents.fetchMe(),
    achievements.fetchRegistry(),
    onboarding.fetchProgress(),
    battlePass.loadAll(),
    shop.fetchBalances(),
  ]);
  progressLoadError.value = Boolean(decks.error || !talentData || !achievementData || !onboardingData);
  pickDefaultHubTab();
  ready.value = true;
}

function pickDefaultHubTab() {
  if (String(route.query.tab || '') === 'quests') {
    hubTab.value = 'quests';
    return;
  }
  const guideOpen = Boolean(
    player.character && !onboarding.finished && (onboarding.steps || []).length,
  );
  const claimableGuide = (onboarding.steps || []).some(s => s.claimable);
  if (guideOpen && claimableGuide) {
    hubTab.value = 'guide';
    return;
  }
  if (battlePass.claimableQuests > 0) {
    hubTab.value = 'quests';
    return;
  }
  hubTab.value = guideOpen ? 'guide' : 'quests';
}

onMounted(loadHub);

function setHubTab(tab) {
  hubTab.value = tab;
  const nextQuery = { ...route.query };
  if (tab === 'quests') nextQuery.tab = 'quests';
  else delete nextQuery.tab;
  const same =
    String(route.query.tab || '') === String(nextQuery.tab || '');
  if (!same) router.replace({ query: nextQuery });
}

watch(
  () => route.query.tab,
  tab => {
    if (String(tab || '') === 'quests') hubTab.value = 'quests';
    else if (hubTab.value === 'quests' && showOnboarding.value) hubTab.value = 'guide';
  },
);

const hasCharacter = computed(() => Boolean(player.character));
const hasConfirmedCharacterAbsence = computed(() => player.hasConfirmedCharacterAbsence);
const hasPlayerLoadError = computed(() => player.characterState === 'error');
const cardCount = computed(() => collection.entries?.length || 0);

const activeDeck = computed(() => (decks.decks || []).find(d => d.isActive));
const talentPoints = computed(() => player.character?.talentPointsAvailable ?? 0);
const combatPreview = computed(() => ninjaProfileStats(player.character?.stats));
const hubStats = computed(() => {
  const total = player.character?.stats?.total || player.character?.stats || {};
  const preview = combatPreview.value;
  return HUB_STAT_KEYS.map(key => {
    let value = Number(total[key]) || 0;
    if (key === 'maxHp') value = preview.maxHp;
    else if (key === 'maxChakra') value = preview.maxChakra;
    else if (key === 'armor') value = preview.armor;
    return {
      key,
      value,
      visual: statVisual(key),
    };
  });
});
const hubResources = computed(() =>
  [
    { key: 'ryos', icon: 'ryos', tone: 'wood' },
    { key: 'kageCoins', icon: 'coins', tone: 'gold' },
    { key: 'dust', icon: 'dust', tone: 'indigo' },
    { key: 'essence', icon: 'essence', tone: 'vermilion' },
  ].map(resource => ({
    ...resource,
    value: Number(shop.balances?.[resource.key]) || 0,
  })),
);

function stepLabel(step) {
  return locale.value?.startsWith('en') ? step.nameEn : step.nameFr;
}

function stepHint(step) {
  return locale.value?.startsWith('en') ? step.hintEn : step.hintFr;
}

function rewardLabel(step) {
  const parts = (step.rewards || []).map(r => {
    if (r.type === 'ryos') return `+${r.amount} Ryos`;
    if (r.type === 'xp') return `+${r.amount} XP`;
    return `+${r.amount} ${r.type}`;
  });
  return parts.join(' · ');
}

const steps = computed(() =>
  (onboarding.steps || []).map(step => ({
    ...step,
    done: Boolean(step.completed),
    label: stepLabel(step),
    hint: stepHint(step),
    to: step.route || { name: 'hub' },
    rewardText: rewardLabel(step),
  })),
);

const nextStep = computed(
  () => steps.value.find(s => !s.done) || steps.value.find(s => s.claimable) || null,
);
const showOnboarding = computed(
  () => hasCharacter.value && !onboarding.finished && steps.value.length > 0,
);
const showProgressPanel = computed(() => hasCharacter.value && !progressLoadError.value);
const claimableGuideCount = computed(() => steps.value.filter(s => s.claimable).length);
const claimableTierCount = computed(() => battlePass.claimableTiers || 0);

async function claimStep(step) {
  if (!step?.claimable || onboarding.actionLoading) return;
  claimMessage.value = null;
  const result = await onboarding.claimStep(step.key);
  if (!result) {
    claimMessage.value = onboarding.error || t('hub.onboardingClaimError');
    return;
  }
  const claimed = result.step || step;
  claimMessage.value = t('hub.onboardingClaimed', { reward: rewardLabel(claimed) });
  await Promise.all([player.fetchPlayer(), notifications.fetchNotifications()]);
}

async function claimQuest(questId) {
  if (!questId || battlePass.actionLoading) return;
  claimMessage.value = null;
  const result = await battlePass.claimQuest(questId);
  if (!result) {
    claimMessage.value =
      battlePass.errorCode === 'INVENTORY_FULL'
        ? t('inventory.chestFullClaim')
        : battlePass.error || t('hub.questClaimError');
    return;
  }
  const xpGained = result.xp?.xpGained || 0;
  claimMessage.value = t('hub.questClaimed', { xp: xpGained });
  await notifications.fetchNotifications();
}

const shortcuts = computed(() =>
  [
    {
      name: 'missions',
      to: '/missions',
      label: t('nav.missions'),
      hint: t('hub.shortcutMissions'),
    },
    { name: 'coop', to: '/coop', label: t('coop.title'), hint: t('coop.lead') },
    {
      name: 'deck-duels',
      to: '/deck-duels',
      label: t('nav.deckDuels'),
      hint: t('hub.shortcutPvp'),
    },
    {
      name: 'village',
      to: { name: 'village' },
      label: t('village.title'),
      hint: t('village.pageLead'),
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

            <ul
              class="hub-welcome__stats"
              data-testid="hub-welcome-stats"
              :aria-label="t('player.statsTitle')"
            >
              <li
                v-for="row in hubStats"
                :key="row.key"
                class="hub-chip"
                :title="t(`player.stats.${row.key}`)"
              >
                <span
                  class="hub-chip__icon"
                  aria-hidden="true"
                  :style="{ '--stat-fill': row.visual.fill }"
                >
                  <i :style="{ maskImage: `url(${row.visual.icon})` }" />
                </span>
                <span class="sr-only">{{ t(`player.stats.${row.key}`) }}</span>
                <span class="hub-chip__value">{{ row.value }}</span>
              </li>
            </ul>

            <dl
              class="hub-welcome__wallet"
              :aria-label="t('resources.balancesLabel')"
              data-testid="hub-welcome-wallet"
            >
              <div
                v-for="resource in hubResources"
                :key="resource.key"
                class="hub-chip hub-chip--wallet"
                :data-tone="resource.tone"
                :title="t(`resources.${resource.key}`, { n: resource.value })"
              >
                <dt class="sr-only">{{ t(`resources.names.${resource.key}`) }}</dt>
                <dd>
                  <AppIcon :name="resource.icon" size="0.9rem" aria-hidden="true" />
                  <span class="hub-chip__value">{{ n(resource.value) }}</span>
                </dd>
              </div>
            </dl>
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
        <section
          v-else-if="showProgressPanel"
          class="page-section"
          data-testid="hub-progress"
        >
          <div class="section-head">
            <span class="section-head__index">02</span>
            <h2 class="section-head__title">{{ t('hub.progressTitle') }}</h2>
            <span class="section-head__rule" />
          </div>
          <p class="mt-3 text-ink-muted">{{ t('hub.progressLead') }}</p>
          <p v-if="claimMessage" class="alert alert--success mt-3" role="status">
            {{ claimMessage }}
          </p>

          <div v-if="showOnboarding" class="hub-tabs mt-5">
            <div class="tabs" role="tablist" :aria-label="t('hub.progressTitle')">
              <button
                type="button"
                role="tab"
                class="tab"
                :aria-selected="hubTab === 'guide'"
                data-testid="hub-tab-guide"
                @click="setHubTab('guide')"
              >
                {{ t('hub.tabGuide') }}
                <span v-if="claimableGuideCount" class="tab__count">{{ claimableGuideCount }}</span>
              </button>
              <button
                type="button"
                role="tab"
                class="tab"
                :aria-selected="hubTab === 'quests'"
                data-testid="hub-tab-quests"
                @click="setHubTab('quests')"
              >
                {{ t('hub.tabQuests') }}
                <span v-if="battlePass.claimableQuests" class="tab__count">{{
                  battlePass.claimableQuests
                }}</span>
              </button>
            </div>
          </div>

          <div
            v-show="showOnboarding && hubTab === 'guide'"
            class="mt-5"
            role="tabpanel"
            data-testid="hub-checklist"
          >
            <p class="text-ink-muted">{{ t('hub.nextStepsLead') }}</p>
            <p class="mt-1 text-sm text-ink-muted">
              {{
                t('hub.onboardingProgress', {
                  done: onboarding.meta?.completed || 0,
                  total: onboarding.meta?.total || steps.length,
                })
              }}
            </p>

            <ol class="hub-steps rule-list stagger">
              <li
                v-for="(step, index) in steps"
                :key="step.key"
                class="hub-step"
                :class="{
                  'hub-step--done': step.done && !step.claimable,
                  'hub-step--claimable': step.claimable,
                }"
                :style="{ '--i': index }"
              >
                <span class="hub-step__index" aria-hidden="true">{{ index + 1 }}</span>
                <div class="min-w-0">
                  <p class="hub-step__label">{{ step.label }}</p>
                  <p v-if="!step.done || step.claimable" class="hub-step__hint">{{ step.hint }}</p>
                  <p v-if="step.rewardText" class="hub-step__reward">{{ step.rewardText }}</p>
                </div>
                <div class="hub-step__actions">
                  <RouterLink
                    v-if="!step.done"
                    :to="step.to"
                    class="btn-ghost btn-sm shrink-0"
                    :data-testid="`hub-step-${step.key}`"
                  >
                    {{ t('hub.go') }}
                  </RouterLink>
                  <button
                    v-else-if="step.claimable"
                    type="button"
                    class="btn-primary btn-sm shrink-0"
                    :disabled="onboarding.actionLoading"
                    :data-testid="`hub-claim-${step.key}`"
                    @click="claimStep(step)"
                  >
                    {{ t('hub.claimReward') }}
                  </button>
                  <span v-else class="hub-step__done">
                    <AppIcon name="check" size="1rem" :stroke-width="2.5" />
                    {{ t('hub.done') }}
                  </span>
                </div>
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
          </div>

          <div
            v-show="!showOnboarding || hubTab === 'quests'"
            class="mt-5"
            role="tabpanel"
            data-testid="hub-quests"
          >
            <p class="text-ink-muted">{{ t('hub.questsLead') }}</p>

            <div class="hub-bp-cta mt-4">
              <RouterLink
                to="/battle-pass"
                class="btn-primary"
                data-testid="hub-battle-pass-cta"
              >
                {{ t('hub.openBattlePass') }}
                <span v-if="claimableTierCount" class="hub-bp-cta__count">{{
                  claimableTierCount
                }}</span>
                <AppIcon name="arrow-right" size="1.125rem" :stroke-width="2" />
              </RouterLink>
              <p v-if="claimableTierCount" class="hub-bp-cta__hint">
                {{ t('hub.claimableTiers', { n: claimableTierCount }) }}
              </p>
            </div>

            <div class="hub-quests mt-8">
              <QuestList
                :title="t('battlePass.dailyQuests')"
                :quests="battlePass.dailyQuests"
                :locale="locale"
                :busy="battlePass.actionLoading"
                @claim="claimQuest"
              />
              <QuestList
                :title="t('battlePass.weeklyQuests')"
                :quests="battlePass.weeklyQuests"
                :locale="locale"
                :busy="battlePass.actionLoading"
                @claim="claimQuest"
              />
            </div>
          </div>
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
              :key="link.name"
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

.hub-welcome__stats,
.hub-welcome__wallet {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
}

.hub-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.55rem;
  padding: 0.15rem 0.45rem 0.15rem 0.3rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
}

.hub-chip__icon {
  display: grid;
  width: 0.95rem;
  height: 0.95rem;
  place-items: center;
  color: var(--stat-fill);
}

.hub-chip__icon i {
  width: 0.9rem;
  height: 0.9rem;
  background: var(--stat-fill);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
}

.hub-chip__value {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  font-stretch: 82%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}

.hub-chip--wallet {
  border-color: color-mix(in srgb, var(--tone-fill) 55%, var(--color-line));
}

.hub-chip--wallet dd {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  color: var(--tone);
}

.hub-chip--wallet .hub-chip__value {
  color: var(--color-ink);
}

.hub-welcome__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem 1.25rem;
  align-content: start;
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
  white-space: nowrap;
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

.hub-tabs {
  margin-top: 1.25rem;
}

.hub-bp-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.hub-bp-cta .btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.hub-bp-cta__count {
  display: inline-grid;
  place-items: center;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-on-fill) 22%, transparent);
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.hub-bp-cta__hint {
  font-size: 0.875rem;
  color: var(--color-ink-muted);
}

.hub-quests {
  display: grid;
  gap: 2.5rem;
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

.hub-step__reward {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-vermilion);
}

.hub-step__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
}

.hub-step--claimable .hub-step__index {
  color: var(--color-leaf);
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
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    gap: 3rem;
    align-items: start;
  }

  .hub-welcome__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hub-shortcuts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }
}
</style>
