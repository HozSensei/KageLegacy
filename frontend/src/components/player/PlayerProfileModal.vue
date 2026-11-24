<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ninjaNicknameLabel, ninjaProfileStats, ninjaRankLabel } from '../../utils/ninjaProfile.js';
import NinjaProfileCard from './NinjaProfileCard.vue';

defineOptions({ name: 'PlayerProfileModal' });

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  player: { type: Object, default: null },
});

const emit = defineEmits(['close']);
const { t, te } = useI18n();

const cardStats = computed(() => ninjaProfileStats({ total: {} }));
const rankLabel = computed(() =>
  props.player?.rank ? ninjaRankLabel(props.player.rank, t, te) : null
);
const nickname = computed(() => {
  const id = props.player?.profile?.nicknameId;
  return id ? ninjaNicknameLabel(id, t, te) : '';
});

function onBackdrop(event) {
  if (event.target === event.currentTarget) emit('close');
}
</script>

<template>
  <div
    v-if="open"
    class="profile-modal"
    role="dialog"
    aria-modal="true"
    :aria-label="t('community.profileModalTitle')"
    @click="onBackdrop"
  >
    <div class="profile-modal__panel panel">
      <header class="profile-modal__header">
        <h2 class="t-heading">{{ t('community.profileModalTitle') }}</h2>
        <button type="button" class="btn-ghost btn-sm" @click="emit('close')">
          {{ t('common.dismiss') }}
        </button>
      </header>

      <p v-if="loading" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="alert alert--error" role="alert">
        {{ t('community.profileLoadFailed') }}
      </p>
      <div v-else-if="player" class="profile-modal__body">
        <NinjaProfileCard
          :name="player.name"
          :rank="rankLabel"
          :level="player.level"
          :profile="player.profile"
          :faction-id="player.factionId"
          :faction-accent="player.faction?.accentColor"
          :stats="cardStats"
        />
        <p v-if="nickname" class="text-ink-muted">{{ nickname }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: color-mix(in srgb, #120c08 62%, transparent);
}

.profile-modal__panel {
  width: min(24rem, 100%);
  display: grid;
  gap: 0.85rem;
}

.profile-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.profile-modal__body {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
}
</style>
