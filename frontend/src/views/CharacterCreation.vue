<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '../stores/player'
import { useLeaderboardStore } from '../stores/leaderboard'
import AppIcon from '../components/ui/AppIcon.vue'
import { elementTone } from '../utils/cardVisuals'

defineOptions({ name: 'CharacterCreationView' })

const { t } = useI18n()
const router = useRouter()
const player = usePlayerStore()
const lb = useLeaderboardStore()

const name = ref('')
const elementAffinity = ref('Katon')
const factionId = ref('midorihara')

const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon']

const previewName = computed(() => name.value.trim())
const previewInitial = computed(() => (previewName.value.charAt(0) || '?').toUpperCase())
const previewFaction = computed(() =>
  factionId.value ? t(`factions.names.${factionId.value}`) : ''
)
const previewFactionAccent = computed(
  () => lb.factions.find((f) => f.id === factionId.value)?.accentColor || '#2d6a4f'
)

onMounted(async () => {
  if (!player.checked) await player.fetchPlayer()
  if (player.character) {
    await router.replace({ name: 'profile' })
    return
  }
  await lb.fetchFactions()
  if (lb.factions.length && !lb.factions.some((f) => f.id === factionId.value)) {
    factionId.value = lb.factions[0].id
  }
})

async function submit() {
  const created = await player.createCharacter({
    name: name.value.trim(),
    elementAffinity: elementAffinity.value,
    factionId: factionId.value || null,
  })
  if (created) await router.push({ name: 'hub' })
}
</script>

<template>
  <div class="page-shell" data-testid="character-creation">
    <div class="creation">
      <div class="creation__form">
        <p class="page-kicker">{{ t('player.createKicker') }}</p>
        <h1 class="page-title mt-3">{{ t('player.createTitle') }}</h1>
        <p class="page-lead mt-3">{{ t('player.createLead') }}</p>

        <p v-if="player.error" class="alert alert--error mt-6" data-testid="create-error">
          {{ player.error }}
        </p>

        <form class="mt-8 space-y-7" @submit.prevent="submit">
          <label class="field">
            <span class="field__label">{{ t('player.nameLabel') }}</span>
            <input
              v-model="name"
              type="text"
              required
              minlength="2"
              maxlength="100"
              data-testid="create-name"
              class="input-field"
            />
          </label>

          <fieldset>
            <legend class="field__label">{{ t('player.elementLabel') }}</legend>
            <div class="creation__elements">
              <label
                v-for="el in ELEMENTS"
                :key="el"
                class="creation__element"
                :class="{ 'is-active': elementAffinity === el }"
                :data-tone="elementTone(el)"
              >
                <input v-model="elementAffinity" type="radio" class="sr-only" :value="el" />
                <span class="shape shape--circle" aria-hidden="true" />
                {{ t(`player.elements.${el}`) }}
              </label>
            </div>
          </fieldset>

          <fieldset v-if="lb.factions.length" data-testid="create-faction">
            <legend class="field__label">{{ t('factions.pickLabel') }}</legend>
            <p class="creation__faction-hint">{{ t('factions.pickLead') }}</p>
            <div class="creation__factions">
              <label
                v-for="f in lb.factions"
                :key="f.id"
                class="creation__faction"
                :class="{ 'is-active': factionId === f.id }"
                :style="{ '--faction-accent': f.accentColor }"
              >
                <input v-model="factionId" type="radio" class="sr-only" :value="f.id" />
                <span class="creation__faction-banner" aria-hidden="true" />
                <span class="creation__faction-name">{{ t(`factions.names.${f.id}`) }}</span>
                <span class="creation__faction-tone">{{ t(`factions.tones.${f.id}`) }}</span>
              </label>
            </div>
          </fieldset>

          <p class="creation__hint">
            {{ t('player.createHint') }}
          </p>

          <button
            type="submit"
            class="btn-primary btn-lg"
            :disabled="player.loading || name.trim().length < 2"
            data-testid="create-submit"
          >
            {{ player.loading ? t('common.loading') : t('player.createSubmit') }}
            <AppIcon name="arrow-right" size="1.1rem" />
          </button>
        </form>
      </div>

      <aside class="creation__preview" aria-hidden="true">
        <p class="t-kicker">{{ t('player.previewLabel') }}</p>
        <div class="creation__card" :data-tone="elementTone(elementAffinity)">
          <span class="creation__card-band" />
          <span :key="previewInitial" class="creation__avatar">{{ previewInitial }}</span>
          <p class="creation__name" :class="{ 'is-empty': !previewName }">
            {{ previewName || t('player.previewNamePlaceholder') }}
          </p>
          <p class="creation__tags">
            <span class="creation__tag creation__tag--tone">
              <span class="dot" />
              {{ t(`player.elements.${elementAffinity}`) }}
            </span>
            <span
              v-if="previewFaction"
              class="creation__tag"
              :style="{ borderLeft: `3px solid ${previewFactionAccent}` }"
            >
              {{ previewFaction }}
            </span>
          </p>
          <p class="creation__level">
            <span>{{ t('player.levelWord') }}</span>
            <strong>1</strong>
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.creation {
  display: grid;
  gap: 2.5rem;
}

@media (min-width: 960px) {
  .creation {
    grid-template-columns: minmax(0, 34rem) minmax(0, 1fr);
    gap: 4rem;
    align-items: start;
  }
}

.creation__elements {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.6rem;
}

@media (min-width: 520px) {
  .creation__elements {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.creation__element {
  display: flex;
  cursor: pointer;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.8rem;
  border-bottom: 4px solid transparent;
  background: var(--color-bg-card);
  font-weight: 700;
  color: var(--color-ink);
  transition:
    background var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.creation__element .shape {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--tone-fill);
}

.creation__element:hover {
  transform: translateY(-2px);
}

.creation__element.is-active {
  border-bottom-color: var(--tone-fill);
  background: var(--tone-tint);
}

.creation__element:focus-within {
  outline: 2px solid var(--color-indigo);
  outline-offset: 2px;
}

.creation__hint {
  max-width: 34rem;
  padding-left: 1rem;
  border-left: 4px solid var(--color-line-strong);
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.creation__faction-hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.creation__factions {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.75rem;
  grid-template-columns: 1fr;
}

@media (min-width: 520px) {
  .creation__factions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.creation__faction {
  display: flex;
  cursor: pointer;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--faction-accent) 40%, transparent);
  background: color-mix(in srgb, var(--faction-accent) 10%, var(--color-bg-card));
  transition:
    border-color var(--dur-fast) ease,
    transform var(--dur-base) var(--ease-out-quint);
}

.creation__faction:hover {
  transform: translateY(-2px);
}

.creation__faction.is-active {
  border-color: var(--faction-accent);
  box-shadow: inset 0 0 0 1px var(--faction-accent);
}

.creation__faction-banner {
  display: block;
  height: 0.3rem;
  margin-bottom: 0.35rem;
  background: var(--faction-accent);
}

.creation__faction-name {
  font-family: var(--font-display);
  font-weight: 700;
}

.creation__faction-tone {
  font-size: 0.75rem;
  color: var(--color-ink-muted);
}

.creation__preview {
  display: none;
}

@media (min-width: 960px) {
  .creation__preview {
    position: sticky;
    top: 6rem;
    display: block;
    max-width: 22rem;
    justify-self: end;
    width: 100%;
  }
}

.creation__card {
  position: relative;
  overflow: hidden;
  margin-top: 0.75rem;
  padding: 5.5rem 1.5rem 1.5rem;
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
}

.creation__card-band {
  position: absolute;
  inset: 0 0 auto 0;
  height: 3.75rem;
  background: var(--tone-fill);
  transition: background var(--dur-base) ease;
}

.creation__avatar {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  display: grid;
  width: 4.5rem;
  height: 4.5rem;
  place-items: center;
  background: var(--color-on-fill);
  font-family: var(--font-display);
  font-size: 2.75rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 1;
  color: var(--color-indigo-deep);
  animation: pop-in 320ms var(--ease-out-quint) both;
}

.creation__name {
  margin-top: 1.25rem;
  overflow-wrap: anywhere;
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 800;
  font-stretch: 78%;
  line-height: 0.95;
  letter-spacing: -0.02em;
}

.creation__name.is-empty {
  color: color-mix(in srgb, var(--color-on-fill) 45%, transparent);
}

.creation__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.9rem;
}

.creation__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  background: color-mix(in srgb, var(--color-on-fill) 14%, transparent);
  font-size: 0.8125rem;
  font-weight: 600;
}

.creation__tag--tone .dot {
  color: var(--tone-fill);
}

.creation__level {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 0.9rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-fill) 22%, transparent);
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.creation__level strong {
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.78;
  letter-spacing: -0.03em;
}
</style>
