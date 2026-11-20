<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlayerStore } from '../../stores/player.js';
import {
  ninjaAppearanceChanges,
  ninjaNicknameLabel,
  ninjaProfileStats,
  ninjaRankLabel,
  readNinjaAppearance,
} from '../../utils/ninjaProfile.js';
import NinjaAvatarPicker from './NinjaAvatarPicker.vue';
import NinjaCardBackgroundPicker from './NinjaCardBackgroundPicker.vue';
import NinjaProfileCard from './NinjaProfileCard.vue';

const props = defineProps({
  character: { type: Object, required: true },
});

const { t, te } = useI18n();
const player = usePlayerStore();
const saved = computed(() => readNinjaAppearance(props.character.profile));
const draft = ref({ ...saved.value });
const changes = computed(() => ninjaAppearanceChanges(saved.value, draft.value));
const dirty = computed(() => Object.keys(changes.value).length > 0);
const status = ref(null);
const saveError = ref(null);
const cardStats = computed(() => ninjaProfileStats(props.character.stats));
const nicknames = computed(() => props.character.profile?.unlockedNicknameIds ?? []);

watch(saved, (next, previous) => {
  draft.value = { ...next, ...ninjaAppearanceChanges(previous, draft.value) };
});

function clearFeedback() {
  status.value = null;
  saveError.value = null;
}

function discard() {
  draft.value = { ...saved.value };
  saveError.value = null;
  status.value = 'discarded';
}

async function save() {
  if (!dirty.value || player.savingProfile) return;
  clearFeedback();
  const profile = await player.updateCharacterProfile(changes.value);
  if (profile) {
    draft.value = readNinjaAppearance(profile);
    status.value = 'saved';
  } else {
    saveError.value = player.profileError || t('player.appearance.saveError');
  }
}
</script>

<template>
  <section class="appearance" data-testid="player-appearance">
    <header class="appearance__header">
      <div class="section-head">
        <h2 class="section-head__title">{{ t('player.appearance.title') }}</h2>
        <span class="section-head__rule" aria-hidden="true" />
      </div>
      <p class="mt-2 text-ink-muted">{{ t('player.appearance.lead') }}</p>
    </header>

    <div class="appearance__preview">
      <p class="t-kicker mb-2">{{ t('player.previewLabel') }}</p>
      <NinjaProfileCard
        :name="character.name"
        :rank="ninjaRankLabel(character.rank, t, te)"
        :level="character.level"
        :profile="draft"
        :stats="cardStats"
        :arts="character.stats?.total"
      />
      <p
        v-if="character.factionId"
        class="appearance__faction"
        :style="{ borderLeftColor: character.faction?.accentColor || 'currentColor' }"
        data-testid="profile-faction"
      >
        {{ t(`factions.names.${character.factionId}`) }}
      </p>
    </div>

    <form
      class="appearance__form"
      data-testid="profile-appearance-form"
      @submit.prevent="save"
      @input="clearFeedback"
    >
      <fieldset class="appearance__fields" :disabled="player.savingProfile">
        <legend class="sr-only">{{ t('player.appearance.title') }}</legend>
        <NinjaAvatarPicker v-model="draft.avatarId" :rank="character.rank" />
        <NinjaCardBackgroundPicker v-model="draft.backgroundId" @update:model-value="clearFeedback" />

        <label class="field">
          <span class="field__label">{{ t('player.appearance.nickname') }}</span>
          <select v-model="draft.nicknameId" class="input-field" data-testid="profile-nickname">
            <option :value="null">{{ t('player.appearance.noNickname') }}</option>
            <option
              v-if="draft.nicknameId && !nicknames.includes(draft.nicknameId)"
              :value="draft.nicknameId"
              disabled
            >
              {{ ninjaNicknameLabel(draft.nicknameId, t, te) }}
            </option>
            <option v-for="id in nicknames" :key="id" :value="id">
              {{ ninjaNicknameLabel(id, t, te) }}
            </option>
          </select>
        </label>
        <p v-if="!nicknames.length" class="appearance__hint">
          {{ t('player.appearance.noUnlockedNicknames') }}
        </p>
      </fieldset>

      <div class="appearance__actions">
        <button
          type="submit"
          class="btn-primary"
          :disabled="!dirty || player.savingProfile"
          data-testid="profile-save"
        >
          {{ player.savingProfile ? t('player.appearance.saving') : t('player.appearance.save') }}
        </button>
        <button
          type="button"
          class="btn-ghost"
          :disabled="!dirty || player.savingProfile"
          data-testid="profile-discard"
          @click="discard"
        >
          {{ t('player.appearance.discard') }}
        </button>
      </div>
      <p class="appearance__hint" role="status" data-testid="profile-save-status">
        {{
          dirty ? t('player.appearance.unsaved') : status ? t(`player.appearance.${status}`) : ''
        }}
      </p>
      <p v-if="saveError" class="alert alert--error" role="alert" data-testid="profile-save-error">
        {{ saveError }}
      </p>
    </form>
  </section>
</template>

<style scoped>
.appearance {
  display: grid;
  gap: 1.25rem 2rem;
  align-items: start;
}

.appearance__preview {
  width: 100%;
  max-width: 28rem;
  min-width: 0;
}

.appearance__faction {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-left: 3px solid;
  background: var(--color-bg-soft);
  font-size: 0.85rem;
  font-weight: 600;
}

.appearance__form,
.appearance__fields {
  display: grid;
  min-width: 0;
  gap: 0.85rem;
}

.appearance__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
}

.appearance__hint {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

@media (min-width: 900px) {
  .appearance {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  }

  .appearance__header {
    grid-column: 1 / -1;
  }

  .appearance__preview {
    position: sticky;
    top: 6rem;
  }
}
</style>
