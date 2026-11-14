<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '../stores/player'
import { useCollectionStore } from '../stores/collection'
import { useDecksStore } from '../stores/decks'
import { useTalentTreeStore } from '../stores/talentTree'
import EmptyState from '../components/ui/EmptyState.vue'

defineOptions({ name: 'HubView' })

const { t } = useI18n()
const player = usePlayerStore()
const collection = useCollectionStore()
const decks = useDecksStore()
const talents = useTalentTreeStore()
const ready = ref(false)

onMounted(async () => {
  await Promise.all([
    player.fetchPlayer(),
    collection.fetchCollection(),
    decks.fetchDecks(),
    talents.loadAll().catch(() => null),
  ])
  ready.value = true
})

const hasCharacter = computed(() => Boolean(player.character))
const cardCount = computed(() => collection.entries?.length || 0)
const hasDeck = computed(() => (decks.decks || []).length > 0)
const activeDeck = computed(() => (decks.decks || []).find((d) => d.isActive) || decks.decks?.[0])
const talentPoints = computed(() => player.character?.talentPointsAvailable ?? 0)
const unlockedTalents = computed(() => talents.unlockedNodeIds?.length ?? 0)

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
    done: hasDeck.value && cardCount.value > 0,
    label: t('hub.stepDeck'),
    hint: t('hub.hintDeck'),
    to: '/decks',
  },
  {
    key: 'talents',
    done: unlockedTalents.value > 0 || talentPoints.value === 0,
    label: t('hub.stepTalents'),
    hint: t('hub.hintTalents'),
    to: '/talents',
  },
  {
    key: 'mission',
    done: false,
    soft: true,
    label: t('hub.stepMission'),
    hint: t('hub.hintMission'),
    to: '/missions',
  },
])

const nextStep = computed(() => steps.value.find((s) => !s.done && !s.soft) || steps.value.find((s) => !s.done))
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="hub-page">
    <div>
      <p class="page-kicker">{{ t('hub.kicker') }}</p>
      <h1 class="page-title mt-2">{{ t('hub.title') }}</h1>
      <p class="page-lead mt-3 max-w-xl">{{ t('hub.lead') }}</p>
    </div>

    <p v-if="!ready" class="mt-10 text-sm text-ink-muted">{{ t('common.loading') }}</p>

    <template v-else>
      <EmptyState
        v-if="!hasCharacter"
        class="mt-10"
        :title="t('hub.noCharacterTitle')"
        :lead="t('hub.noCharacterLead')"
        primary-to="/character-creation"
        :primary-label="t('hub.createCharacter')"
      />

      <template v-else>
        <section class="mt-10 border border-line/70 bg-bg-soft/30 px-5 py-5" data-testid="hub-welcome">
          <p class="text-[11px] uppercase tracking-[0.14em] text-accent">{{ t('hub.welcomeBack') }}</p>
          <h2 class="mt-2 font-display text-2xl text-ink">{{ player.character.name }}</h2>
          <p class="mt-2 text-sm text-ink-muted">
            {{ t('player.levelLabel', { level: player.character.level }) }}
            <span class="mx-2 text-ink-faint">·</span>
            {{ t('hub.cardsOwned', { n: cardCount }) }}
            <template v-if="activeDeck">
              <span class="mx-2 text-ink-faint">·</span>
              {{ t('hub.activeDeck', { name: activeDeck.name }) }}
            </template>
          </p>
        </section>

        <section class="mt-10" data-testid="hub-checklist">
          <p class="section-label">{{ t('hub.nextSteps') }}</p>
          <p class="mt-2 text-sm text-ink-muted">{{ t('hub.nextStepsLead') }}</p>

          <ul class="mt-6 space-y-4">
            <li
              v-for="step in steps"
              :key="step.key"
              class="flex items-start justify-between gap-3 border-l-2 pl-4"
              :class="step.done ? 'border-line' : 'border-accent/60'"
            >
              <div class="min-w-0">
                <p class="text-sm" :class="step.done ? 'text-ink-faint line-through' : 'text-ink'">
                  {{ step.label }}
                </p>
                <p v-if="!step.done" class="mt-1 text-xs text-ink-faint">{{ step.hint }}</p>
              </div>
              <RouterLink
                v-if="!step.done"
                :to="step.to"
                class="btn-ghost shrink-0 text-[10px]"
                :data-testid="`hub-step-${step.key}`"
              >
                {{ t('hub.go') }}
              </RouterLink>
              <span v-else class="shrink-0 text-[10px] uppercase tracking-[0.14em] text-accent">
                {{ t('hub.done') }}
              </span>
            </li>
          </ul>

          <RouterLink
            v-if="nextStep"
            :to="nextStep.to"
            class="btn-primary mt-6 inline-flex text-xs"
            data-testid="hub-primary-cta"
          >
            {{ t('hub.continueCta', { step: nextStep.label }) }}
          </RouterLink>
        </section>

        <nav class="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="hub-shortcuts">
          <RouterLink
            v-for="link in [
              { to: '/missions', label: t('nav.missions'), hint: t('hub.shortcutMissions') },
              { to: '/talents', label: t('nav.talents'), hint: t('hub.shortcutTalents') },
              { to: '/decks', label: t('nav.decks'), hint: t('hub.shortcutDecks') },
              { to: '/collection', label: t('nav.collection'), hint: t('hub.shortcutCollection') },
              { to: '/shop', label: t('nav.shop'), hint: t('hub.shortcutShop') },
              { to: '/battle-pass', label: t('nav.battlePass'), hint: t('hub.shortcutBp') },
              { to: '/pvp', label: t('nav.pvp'), hint: t('hub.shortcutPvp') },
              { to: '/profil', label: t('nav.profile'), hint: t('hub.shortcutProfile') },
            ]"
            :key="link.to"
            :to="link.to"
            class="border border-line/70 px-4 py-3 transition hover:border-accent/50"
          >
            <p class="text-sm text-ink">{{ link.label }}</p>
            <p class="mt-1 text-xs text-ink-faint">{{ link.hint }}</p>
          </RouterLink>
        </nav>
      </template>
    </template>
  </div>
</template>
