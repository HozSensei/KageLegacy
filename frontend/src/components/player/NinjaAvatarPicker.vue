<script setup>
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  canUseNinjaAvatarRank,
  NINJA_AVATAR_GRID_SIZE,
  NINJA_AVATAR_GROUPS,
  STARTING_NINJA_RANK,
} from '../../constants/ninjaAvatars.js';
import NinjaPortrait from './NinjaPortrait.vue';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'NinjaAvatarPicker' });

const props = defineProps({
  rank: { type: String, default: STARTING_NINJA_RANK },
});
const avatarId = defineModel({ type: String, default: null });

const { t } = useI18n();
const groupName = useId();
const rankIndex = ref(0);
const group = computed(() => NINJA_AVATAR_GROUPS[rankIndex.value]);
const portraits = computed(() => group.value.sheets.flat());
const locked = computed(() => !canUseNinjaAvatarRank(group.value.rank, props.rank));
const selected = computed(() => {
  const [rank, sheet, portrait] = avatarId.value?.split('-') ?? [];
  const index = NINJA_AVATAR_GROUPS.findIndex(entry => entry.rank === rank);
  const sheetNumber = Number(sheet) - 1;
  const portraitIndex = Number(portrait) - 1;
  if (
    !avatarId.value ||
    NINJA_AVATAR_GROUPS[index]?.sheets[sheetNumber]?.[portraitIndex] !== avatarId.value
  ) {
    return null;
  }
  return {
    rank,
    index,
    flatIndex: sheetNumber * NINJA_AVATAR_GRID_SIZE ** 2 + portraitIndex,
  };
});

function portraitLabel(rank, flatIndex) {
  return t('player.avatarPicker.portrait', {
    rank: t(`player.ranks.${rank}`),
    number: flatIndex + 1,
  });
}

watch(
  selected,
  value => {
    if (!value) return;
    rankIndex.value = value.index;
  },
  { immediate: true }
);

function showRank(index) {
  if (index === rankIndex.value) return;
  rankIndex.value = index;
}
</script>

<template>
  <fieldset class="avatar-picker" data-testid="ninja-avatar-picker">
    <legend class="field__label">{{ t('player.avatarPicker.label') }}</legend>
    <p class="avatar-picker__hint">{{ t('player.avatarPicker.hint') }}</p>
    <div class="avatar-picker__ranks" role="group" :aria-label="t('player.avatarPicker.rankLabel')">
      <button
        v-for="(entry, index) in NINJA_AVATAR_GROUPS"
        :key="entry.rank"
        type="button"
        class="avatar-picker__toggle"
        :aria-pressed="rankIndex === index"
        @click="showRank(index)"
      >
        {{ t(`player.ranks.${entry.rank}`) }}
        <template v-if="!canUseNinjaAvatarRank(entry.rank, rank)">
          <AppIcon name="lock" size="0.85rem" />
          <span class="sr-only">{{ t('player.avatarPicker.locked') }}</span>
        </template>
      </button>
    </div>
    <p v-if="locked" class="avatar-picker__hint avatar-picker__locked">
      {{ t('player.avatarPicker.unlockAt', { rank: t(`player.ranks.${group.rank}`) }) }}
    </p>
    <div class="avatar-picker__rail" :class="{ 'is-locked': locked }">
      <label
        v-for="(id, index) in portraits"
        :key="id"
        class="avatar-picker__tile"
        :class="{ 'is-selected': id === avatarId }"
        :title="portraitLabel(group.rank, index)"
      >
        <input
          v-model="avatarId"
          class="sr-only"
          type="radio"
          :name="groupName"
          :value="id"
          :disabled="locked"
        />
        <span class="sr-only">{{ portraitLabel(group.rank, index) }}</span>
        <NinjaPortrait :avatar-id="id" />
        <span v-if="locked || id === avatarId" class="avatar-picker__badge" aria-hidden="true">
          <AppIcon :name="locked ? 'lock' : 'check'" size="0.95rem" />
        </span>
      </label>
    </div>
    <p class="avatar-picker__status" role="status" data-testid="ninja-avatar-status">
      {{
        selected
          ? t('player.avatarPicker.selected', {
              portrait: portraitLabel(selected.rank, selected.flatIndex),
            })
          : t('player.avatarPicker.noSelection')
      }}
    </p>
  </fieldset>
</template>

<style scoped>
.avatar-picker {
  min-width: 0;
}

.avatar-picker__hint {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

.avatar-picker__ranks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.75rem;
}

.avatar-picker__locked {
  margin-top: 0.55rem;
}

.avatar-picker__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--color-line);
  background: var(--color-bg-card);
  color: var(--color-ink);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.avatar-picker__toggle[aria-pressed='true'] {
  border-color: var(--color-vermilion);
  box-shadow: inset 0 -2px var(--color-vermilion);
}

.avatar-picker__rail {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.65rem;
  padding: 0.15rem 0.1rem 0.45rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}

.avatar-picker__tile {
  position: relative;
  flex: 0 0 4.25rem;
  width: 4.25rem;
  padding: 2px;
  border: 2px solid var(--color-line);
  cursor: pointer;
  scroll-snap-align: start;
}

.avatar-picker__tile.is-selected,
.avatar-picker__rail:not(.is-locked) .avatar-picker__tile:hover {
  border-color: var(--color-vermilion);
}

.avatar-picker__tile:has(input:focus-visible) {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.is-locked .avatar-picker__tile {
  cursor: not-allowed;
}

.is-locked .ninja-portrait {
  filter: saturate(0.4) brightness(0.78);
}

.avatar-picker__badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: grid;
  width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
  pointer-events: none;
}

.avatar-picker__status {
  margin-top: 0.55rem;
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
