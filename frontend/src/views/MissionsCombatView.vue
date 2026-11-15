<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import EmptyState from '../components/ui/EmptyState.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import forestImage from '../assets/illustrations/forest-path.webp'
import { missionRankTone } from '../utils/missionVisuals'
import { useCombatStore } from '../stores/combat'
import { useMissionsStore } from '../stores/missions'
import { useDecksStore } from '../stores/decks'
import { localizedDescription, localizedName } from '../utils/localeContent.js'

defineOptions({ name: 'MissionsCombatView' })

const { t, locale } = useI18n()
const router = useRouter()
const missions = useMissionsStore()
const combat = useCombatStore()
const decks = useDecksStore()

const startingId = ref(null)
const localError = ref(null)

onMounted(async () => {
  await Promise.all([missions.fetchMissions(), decks.fetchDecks()])
})

const hasActiveDeck = computed(() => Boolean((decks.decks || []).find((d) => d.isActive)))

const activeDeckLabel = computed(() => {
  const active = (decks.decks || []).find((d) => d.isActive)
  if (!active) return t('combat.practiceDeckHint')
  return active.name
})

function missionName(m) {
  return localizedName(m, locale.value)
}

function missionDesc(m) {
  return localizedDescription(m, locale.value)
}

async function startMission(mission) {
  startingId.value = mission.id
  localError.value = null
  combat.error = null
  try {
    const run = await missions.startMission(mission.id)
    if (run?.id) {
      await router.push({ name: 'mission-run', params: { id: run.id } })
    }
  } catch (e) {
    localError.value = e.message || missions.error
  } finally {
    startingId.value = null
  }
}

function resumeRun() {
  if (!missions.activeRun?.id) return
  router.push({ name: 'mission-run', params: { id: missions.activeRun.id } })
}

async function startQuick(templateId) {
  startingId.value = templateId
  localError.value = null
  try {
    const result = await combat.startCombat({ templateId })
    if (result?.id) {
      await router.push({ name: 'combat', params: { id: result.id } })
    }
  } catch (e) {
    localError.value = e.message || combat.error
  } finally {
    startingId.value = null
  }
}
</script>

<template>
  <div class="page-shell" data-testid="missions-combat-page">
    <PageHeader
      index="07"
      tone="leaf"
      :kicker="t('combat.missionsKicker')"
      :title="t('combat.missionsTitle')"
      :lead="t('combat.missionsLead')"
      :image="forestImage"
      image-position="50% 55%"
    />

    <p class="missions-deck">
      <span class="t-kicker">{{ t('combat.activeDeck') }}</span>
      <span class="missions-deck__name">{{ activeDeckLabel }}</span>
    </p>

    <EmptyState
      v-if="!decks.loading && !hasActiveDeck"
      class="mt-6"
      :title="t('combat.noDeckTitle')"
      :lead="t('combat.noDeckLead')"
      primary-to="/decks"
      :primary-label="t('combat.openDecks')"
      secondary-to="/home"
      :secondary-label="t('placeholders.backHome')"
    />

    <div
      v-if="missions.activeRun"
      class="active-run"
      data-testid="active-run-banner"
    >
      <span class="lozenge active-run__mark" aria-hidden="true" />
      <p class="active-run__text">{{ t('combat.activeRunHint') }}</p>
      <button type="button" class="btn-primary" data-testid="resume-run" @click="resumeRun">
        {{ t('combat.resumeRun') }}
        <AppIcon name="arrow-right" size="1rem" />
      </button>
    </div>

    <p v-if="missions.error || localError" class="alert alert--error mt-4">
      {{ localError || missions.error }}
    </p>

    <p v-if="missions.loading" class="mt-8 text-ink-muted">{{ t('combat.loading') }}</p>

    <section class="page-section">
      <div class="section-head">
        <span class="section-head__index">01</span>
        <h2 class="section-head__title">{{ t('combat.missionsListTitle') }}</h2>
        <span class="section-head__rule" aria-hidden="true" />
      </div>

      <div class="mission-grid stagger">
        <article
          v-for="mission in missions.missions"
          :key="mission.id"
          class="mission-card"
          :data-tone="missionRankTone(mission.rank)"
          :data-testid="`mission-${mission.slug}`"
        >
          <div class="mission-card__rank" :title="`${t('combat.rankLabel')} ${mission.rank}`">
            <span class="mission-card__rank-label">{{ t('combat.rankLabel') }}</span>
            <span class="mission-card__rank-value">{{ mission.rank }}</span>
          </div>
          <div class="mission-card__body">
            <h3 class="mission-card__title">{{ missionName(mission) }}</h3>
            <p class="mission-card__desc">{{ missionDesc(mission) }}</p>
            <p class="mission-card__meta">
              <span class="mission-card__pips" aria-hidden="true">
                <span
                  v-for="n in (mission.encounterCount || mission.encounters?.length || 1)"
                  :key="n"
                  class="lozenge"
                />
              </span>
              {{ t('combat.encounterCount', { n: mission.encounterCount || mission.encounters?.length || 1 }) }}
            </p>
            <p v-if="mission.rewards" class="mission-card__rewards">
              {{ t('combat.rewards', { xp: mission.rewards.xp || 0, ryos: mission.rewards.ryos || 0 }) }}
            </p>
            <button
              type="button"
              class="btn-primary btn-sm mission-card__cta"
              data-testid="mission-start"
              :disabled="startingId != null || Boolean(missions.activeRun)"
              @click="startMission(mission)"
            >
              {{
                startingId === mission.id ? t('combat.starting') : t('combat.startMission')
              }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="page-section" data-testid="quick-fight-section">
      <div class="section-head">
        <span class="section-head__index">02</span>
        <h2 class="section-head__title">{{ t('combat.quickFight') }}</h2>
        <span class="section-head__rule" aria-hidden="true" />
      </div>
      <p class="mt-2 max-w-xl text-ink-muted">{{ t('combat.quickFightLead') }}</p>
      <div class="quick-grid">
        <button
          v-for="enemy in missions.enemies"
          :key="enemy.id"
          type="button"
          class="quick-foe"
          :class="{ 'quick-foe--boss': enemy.boss }"
          :data-testid="`quick-fight-${enemy.id}`"
          :disabled="startingId != null || Boolean(missions.activeRun)"
          @click="startQuick(enemy.id)"
        >
          <span class="shape" :class="enemy.boss ? 'shape--lozenge' : 'shape--triangle'" aria-hidden="true" />
          <span class="quick-foe__name">{{ localizedName(enemy, locale) }}</span>
          <span v-if="enemy.hp" class="quick-foe__hp">
            {{ enemy.hp }} <small>{{ t('combat.hpLabel') }}</small>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.missions-deck {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  margin-top: 1.5rem;
}

.missions-deck__name {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-ink);
}

.active-run {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  border-left: 6px solid var(--color-vermilion);
  background: var(--color-vermilion-tint);
  animation: rise-in 420ms var(--ease-out-quint) both;
}

.active-run__mark {
  color: var(--color-vermilion);
}

.active-run__text {
  min-width: 12rem;
  flex: 1;
  font-weight: 500;
  color: var(--color-ink);
}

.mission-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.25rem;
}

@media (min-width: 768px) {
  .mission-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .mission-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.mission-card {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  background: var(--color-bg-card);
  transition: transform var(--dur-base) var(--ease-out-quint);
}

.mission-card:hover {
  transform: translateY(-3px);
}

.mission-card__rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 0.25rem 0.75rem;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.mission-card__rank-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.mission-card__rank-value {
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.8;
}

.mission-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 1.1rem 1.15rem 1.15rem;
}

.mission-card__title {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}

.mission-card__desc {
  flex: 1;
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--color-ink-muted);
}

.mission-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink);
}

.mission-card__pips {
  display: inline-flex;
  gap: 0.3rem;
  color: var(--tone-fill);
}

.mission-card__rewards {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-muted);
}

.mission-card__cta {
  align-self: flex-start;
  margin-top: 0.9rem;
}

.quick-grid {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  margin-top: 1.25rem;
}

.quick-foe {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.8rem 1rem;
  background: var(--color-bg-card);
  text-align: left;
  color: var(--color-vermilion);
  transition:
    background var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.quick-foe--boss {
  color: var(--color-indigo);
}

.quick-foe:hover:not(:disabled) {
  background: var(--color-vermilion-tint);
  transform: translateX(3px);
}

.quick-foe--boss:hover:not(:disabled) {
  background: var(--color-indigo-tint);
}

.quick-foe:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.quick-foe__name {
  min-width: 0;
  flex: 1;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-ink);
}

.quick-foe__hp {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.quick-foe__hp small {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  font-stretch: 100%;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
}
</style>
