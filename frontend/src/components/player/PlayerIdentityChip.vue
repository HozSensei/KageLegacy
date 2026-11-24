<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ninjaNicknameLabel } from '../../utils/ninjaProfile.js';
import NinjaPortrait from './NinjaPortrait.vue';
import ProfileFrameOverlay from './ProfileFrameOverlay.vue';

defineOptions({ name: 'PlayerIdentityChip' });

const props = defineProps({
  userId: { type: [Number, String], default: null },
  name: { type: String, required: true },
  profile: { type: Object, default: null },
  level: { type: Number, default: null },
  clickable: { type: Boolean, default: true },
});

const emit = defineEmits(['open']);

const { t, te, locale } = useI18n();

const title = computed(() => {
  const id = props.profile?.nicknameId;
  return id ? ninjaNicknameLabel(id, t, te, [], locale.value) : '';
});

function onActivate(event) {
  if (!props.clickable || props.userId == null) return;
  emit('open', Number(props.userId), event);
}
</script>

<template>
  <component
    :is="clickable && userId != null ? 'button' : 'span'"
    type="button"
    class="identity-chip"
    :class="{ 'identity-chip--button': clickable && userId != null }"
    :aria-label="
      clickable && userId != null ? t('community.openProfile', { name }) : undefined
    "
    @click="onActivate"
  >
    <span class="identity-chip__avatar">
      <NinjaPortrait :avatar-id="profile?.avatarId" :name="name" :alt="name" />
      <ProfileFrameOverlay :frame-id="profile?.frameId" variant="avatar" />
    </span>
    <span class="identity-chip__text">
      <strong class="identity-chip__name">{{ name }}</strong>
      <span v-if="title" class="identity-chip__title">{{ title }}</span>
      <span v-if="level != null" class="identity-chip__level">
        {{ t('player.levelLabel', { level }) }}
      </span>
    </span>
  </component>
</template>

<style scoped>
.identity-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
}

.identity-chip--button {
  cursor: pointer;
}

.identity-chip--button:hover .identity-chip__name,
.identity-chip--button:focus-visible .identity-chip__name {
  text-decoration: underline;
}

.identity-chip__avatar {
  position: relative;
  flex: 0 0 auto;
  width: 2.25rem;
  border-radius: 50%;
  overflow: visible;
}

.identity-chip__avatar :deep(.ninja-portrait) {
  border-radius: 50%;
}

.identity-chip__text {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}

.identity-chip__name,
.identity-chip__title,
.identity-chip__level {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.identity-chip__title,
.identity-chip__level {
  color: var(--color-ink-muted);
  font-size: 0.8rem;
}
</style>
