<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useCombatStore } from '../stores/combat'
import { useMissionsStore } from '../stores/missions'
import { useDecksStore } from '../stores/decks'

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

const activeDeckLabel = computed(() => {
  const active = (decks.decks || []).find((d) => d.isActive)
  if (!active) return t('combat.practiceDeckHint')
  return active.name
})

function missionName(m) {
  return locale.value === 'en' ? m.nameEn : m.nameFr
}

function missionDesc(m) {
  return locale.value === 'en' ? m.descriptionEn : m.descriptionFr
}

async function startMission(mission) {
  startingId.value = mission.id
  localError.value = null
  combat.error = null
  try {
    const result = await combat.startCombat({ missionId: mission.id })
    if (result?.id) {
      await router.push({ name: 'combat', params: { id: result.id } })
    }
  } catch (e) {
    localError.value = e.message || combat.error
  } finally {
    startingId.value = null
  }
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
  <div class="page-shell page-shell--hero" data-testid="missions-combat-page">
    <div>
      <p class="page-kicker">{{ t('combat.missionsKicker') }}</p>
      <h1 class="page-title mt-2">{{ t('combat.missionsTitle') }}</h1>
      <p class="page-lead mt-3 max-w-xl">{{ t('combat.missionsLead') }}</p>
    </div>

    <p class="mt-4 text-sm text-ink-muted">
      {{ t('combat.activeDeck') }} :
      <span class="text-accent">{{ activeDeckLabel }}</span>
    </p>

    <p v-if="missions.error || localError" class="mt-4 text-sm text-fire">
      {{ localError || missions.error }}
    </p>

    <p v-if="missions.loading" class="mt-8 text-ink-muted">{{ t('combat.loading') }}</p>

    <div class="mission-grid mt-8">
      <article
        v-for="mission in missions.missions"
        :key="mission.id"
        class="mission-card"
        :data-testid="`mission-${mission.slug}`"
      >
        <div class="mission-card__rank">{{ mission.rank }}</div>
        <h2 class="mission-card__title">{{ missionName(mission) }}</h2>
        <p class="mission-card__desc">{{ missionDesc(mission) }}</p>
        <p v-if="mission.rewards" class="mission-card__rewards">
          {{ t('combat.rewards', { xp: mission.rewards.xp || 0, ryos: mission.rewards.ryos || 0 }) }}
        </p>
        <button
          type="button"
          class="btn-primary text-xs mt-4"
          :disabled="startingId != null"
          @click="startMission(mission)"
        >
          {{
            startingId === mission.id ? t('combat.starting') : t('combat.startMission')
          }}
        </button>
      </article>
    </div>

    <section class="mt-12">
      <h2 class="font-display text-xl text-ink">{{ t('combat.quickFight') }}</h2>
      <p class="mt-2 text-sm text-ink-muted max-w-lg">{{ t('combat.quickFightLead') }}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          v-for="enemy in missions.enemies"
          :key="enemy.id"
          type="button"
          class="btn-secondary text-xs"
          :disabled="startingId != null"
          @click="startQuick(enemy.id)"
        >
          {{ locale === 'en' ? enemy.nameEn : enemy.nameFr }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mission-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .mission-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.mission-card {
  position: relative;
  padding: 1.25rem 1.2rem 1.35rem;
  border: 1px solid color-mix(in srgb, var(--color-line) 85%, transparent);
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--color-bg-card) 88%, transparent),
      color-mix(in srgb, var(--color-bg) 95%, transparent)
    );
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.mission-card:hover {
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  transform: translateY(-2px);
}

.mission-card__rank {
  display: inline-block;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  padding: 0.15rem 0.45rem;
}

.mission-card__title {
  margin-top: 0.75rem;
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.15;
}

.mission-card__desc {
  margin-top: 0.55rem;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
  line-height: 1.45;
}

.mission-card__rewards {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-ink-faint);
}
</style>
