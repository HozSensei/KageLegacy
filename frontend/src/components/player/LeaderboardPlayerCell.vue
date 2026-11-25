<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ninjaCardBackgroundUrl } from '../../constants/ninjaCardBackgrounds.js';
import {
  ninjaNicknameLabel,
  ninjaRankLabel,
  safeNinjaProfileColor,
} from '../../utils/ninjaProfile.js';
import NinjaPortrait from './NinjaPortrait.vue';
import ProfileFrameOverlay from './ProfileFrameOverlay.vue';

defineOptions({ name: 'LeaderboardPlayerCell' });

const props = defineProps({
  userId: { type: [Number, String], required: true },
  name: { type: String, required: true },
  level: { type: Number, default: null },
  rankTitle: { type: String, default: null },
  profile: { type: Object, default: null },
});

const emit = defineEmits(['open']);
const { t, te, locale } = useI18n();

const nickname = computed(() => {
  const id = props.profile?.nicknameId;
  return id ? ninjaNicknameLabel(id, t, te, [], locale.value) : '';
});

const rankLabel = computed(() => {
  const raw = props.rankTitle || props.profile?.rank || null;
  return raw ? ninjaRankLabel(raw, t, te) : '';
});

const artUrl = computed(() => ninjaCardBackgroundUrl(props.profile?.backgroundId));
const solidBg = computed(() => safeNinjaProfileColor(props.profile?.backgroundColor));

const artStyle = computed(() => {
  if (artUrl.value) {
    return {
      backgroundImage: `url("${artUrl.value}")`,
    };
  }
  if (solidBg.value) {
    return { backgroundColor: solidBg.value };
  }
  return {
    backgroundImage:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-indigo) 35%, transparent), transparent)',
  };
});

function onOpen(event) {
  emit('open', Number(props.userId), event);
}
</script>

<template>
  <button
    type="button"
    class="lb-player"
    :aria-label="t('community.openProfile', { name })"
    data-testid="leaderboard-player-cell"
    @click="onOpen"
  >
    <span class="lb-player__art" aria-hidden="true" :style="artStyle" />
    <span class="lb-player__avatar">
      <NinjaPortrait :avatar-id="profile?.avatarId" :name="name" :alt="name" />
      <ProfileFrameOverlay :frame-id="profile?.frameId" variant="avatar" />
    </span>
    <span class="lb-player__text">
      <span class="lb-player__line">
        <strong class="lb-player__name">{{ name }}</strong>
        <span v-if="level != null" class="lb-player__level">
          {{ t('leaderboard.playerLevel', { level }) }}
        </span>
        <span v-if="rankLabel" class="lb-player__rank">({{ rankLabel }})</span>
      </span>
      <span v-if="nickname" class="lb-player__title">{{ nickname }}</span>
    </span>
  </button>
</template>

<style scoped>
.lb-player {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem 0.85rem;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0.45rem 0.75rem 0.45rem 0.55rem;
  overflow: hidden;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.lb-player:hover .lb-player__name,
.lb-player:focus-visible .lb-player__name {
  text-decoration: underline;
}

.lb-player__art {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-position: left center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0.92;
  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 28%, transparent 78%);
  mask-image: linear-gradient(to right, #000 0%, #000 28%, transparent 78%);
}

.lb-player__art::after {
  content: '';
  position: absolute;
  inset: 0;
  /* Voile sombre à gauche pour lisibilité du nom / lvl / rang sur fonds clairs. */
  background: linear-gradient(
    to right,
    rgb(0 0 0 / 0.72) 0%,
    rgb(0 0 0 / 0.52) 32%,
    rgb(0 0 0 / 0.22) 58%,
    transparent 82%
  );
}

.lb-player__avatar,
.lb-player__text {
  position: relative;
  z-index: 1;
}

.lb-player__avatar {
  width: 3rem;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--color-bg-card, var(--color-bg)) 80%, transparent),
    0 0.25rem 0.6rem rgb(0 0 0 / 0.35);
}

.lb-player__avatar :deep(.ninja-portrait) {
  border-radius: 50%;
}

.lb-player__text {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.lb-player__line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.4rem;
  min-width: 0;
}

.lb-player__name {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.55);
}

.lb-player__level,
.lb-player__rank {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.lb-player__title {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
