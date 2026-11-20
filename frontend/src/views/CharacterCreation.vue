<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePlayerStore } from '../stores/player';
import { useLeaderboardStore } from '../stores/leaderboard';
import AppIcon from '../components/ui/AppIcon.vue';
import NinjaAvatarPicker from '../components/player/NinjaAvatarPicker.vue';
import NinjaProfileCard from '../components/player/NinjaProfileCard.vue';
import { DEFAULT_NINJA_AVATAR_ID, STARTING_NINJA_RANK } from '../constants/ninjaAvatars.js';
import { ninjaProfileStats, readNinjaAppearance } from '../utils/ninjaProfile.js';

defineOptions({ name: 'CharacterCreationView' });

const { t } = useI18n();
const router = useRouter();
const player = usePlayerStore();
const lb = useLeaderboardStore();

const name = ref('');
const factionId = ref('midorihara');
const avatarId = ref(DEFAULT_NINJA_AVATAR_ID);

const previewName = computed(() => name.value.trim());
const previewProfile = computed(() => readNinjaAppearance({ avatarId: avatarId.value }));
const previewStats = ninjaProfileStats();
const canSubmit = computed(() => !player.loading && previewName.value.length >= 2);
const previewFaction = computed(() =>
  factionId.value ? t(`factions.names.${factionId.value}`) : ''
);
const previewFactionAccent = computed(
  () => lb.factions.find(f => f.id === factionId.value)?.accentColor || '#2d6a4f'
);

onMounted(async () => {
  if (!player.checked) await player.fetchPlayer();
  if (player.character) {
    await router.replace({ name: 'profile' });
    return;
  }
  await lb.fetchFactions();
  if (lb.factions.length && !lb.factions.some(f => f.id === factionId.value)) {
    factionId.value = lb.factions[0].id;
  }
});

async function submit() {
  if (!canSubmit.value) return;
  const created = await player.createCharacter({
    name: previewName.value,
    factionId: factionId.value || null,
    avatarId: avatarId.value,
  });
  if (created) await router.push({ name: 'hub' });
}
</script>

<template>
  <div class="page-shell" data-testid="character-creation">
    <div class="creation">
      <header class="creation__intro">
        <p class="page-kicker">{{ t('player.createKicker') }}</p>
        <h1 class="page-title mt-3">{{ t('player.createTitle') }}</h1>
        <p class="page-lead mt-3">{{ t('player.createLead') }}</p>
      </header>

      <aside class="creation__preview">
        <p class="t-kicker mb-2">{{ t('player.previewLabel') }}</p>
        <NinjaProfileCard
          :name="previewName || t('player.previewNamePlaceholder')"
          :rank="t('player.ranks.aspirant')"
          :level="1"
          :profile="previewProfile"
          :stats="previewStats"
        />
        <p
          v-if="previewFaction"
          class="creation__preview-faction"
          :style="{ borderLeftColor: previewFactionAccent }"
        >
          {{ previewFaction }}
        </p>
      </aside>

      <div class="creation__form">
        <p v-if="player.error" class="alert alert--error mb-6" data-testid="create-error">
          {{ player.error }}
        </p>

        <form class="space-y-7" @submit.prevent="submit">
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

          <NinjaAvatarPicker v-model="avatarId" :rank="STARTING_NINJA_RANK" />

          <p class="creation__hint">
            {{ t('player.createHint') }}
          </p>

          <button
            type="submit"
            class="btn-primary btn-lg"
            :disabled="!canSubmit"
            data-testid="create-submit"
          >
            {{ player.loading ? t('common.loading') : t('player.createSubmit') }}
            <AppIcon name="arrow-right" size="1.1rem" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.creation {
  display: grid;
  gap: 2rem;
}

@media (min-width: 960px) {
  .creation {
    grid-template-columns: minmax(0, 34rem) minmax(0, 1fr);
    column-gap: 4rem;
    align-items: start;
  }

  .creation__form {
    grid-column: 1;
  }

  .creation__preview {
    grid-area: 1 / 2 / span 2;
    position: sticky;
    top: 6rem;
    justify-self: end;
  }
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
  width: 100%;
  max-width: 28rem;
  min-width: 0;
}

.creation__preview-faction {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-left: 3px solid;
  background: var(--color-bg-soft);
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
