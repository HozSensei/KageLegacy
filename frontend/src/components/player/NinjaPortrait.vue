<script setup>
import { computed } from 'vue';
import { getNinjaAvatar, NINJA_AVATAR_GRID_SIZE } from '../../constants/ninjaAvatars.js';

defineOptions({ name: 'NinjaPortrait' });

const props = defineProps({
  avatarId: { type: String, default: null },
  name: { type: String, default: '' },
  alt: { type: String, default: '' },
});

const initial = computed(() => Array.from(props.name.trim())[0]?.toUpperCase() || '?');
const spriteStyle = computed(() => {
  const avatar = getNinjaAvatar(props.avatarId);
  if (!avatar) return null;

  // Crop inside each tile so the separators and fractional pixel edges never show.
  const sheet = 1254;
  const cell = sheet / NINJA_AVATAR_GRID_SIZE;
  const inset = 12;
  const visible = cell - 2 * inset;
  const size = `${(sheet / visible) * 100}%`;
  const position = index => `${((cell * index + inset) / (sheet - visible)) * 100}%`;
  return {
    backgroundImage: `url(${avatar.image})`,
    backgroundSize: `${size} ${size}`,
    backgroundPosition: `${position(avatar.column)} ${position(avatar.row)}`,
  };
});
</script>

<template>
  <span
    class="ninja-portrait"
    :style="spriteStyle"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : true"
  >
    <span v-if="!spriteStyle">{{ initial }}</span>
  </span>
</template>

<style scoped>
.ninja-portrait {
  display: grid;
  width: 100%;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  background-color: var(--color-bg-soft);
  background-repeat: no-repeat;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-weight: 800;
  line-height: 1;
}
</style>
