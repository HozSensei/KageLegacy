<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ninjaProfileStats, ninjaRankLabel } from '../../utils/ninjaProfile.js';
import NinjaProfileCard from './NinjaProfileCard.vue';

defineOptions({ name: 'PlayerProfileModal' });

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  player: { type: Object, default: null },
  /** Élément ancre (chip / nom) — popover sans overlay. */
  anchor: { type: Object, default: null },
});

const emit = defineEmits(['close']);
const { t, te } = useI18n();

const panel = ref(null);
const panelStyle = ref({});

const cardStats = computed(() => ninjaProfileStats({ total: {} }));
const rankLabel = computed(() =>
  props.player?.rank ? ninjaRankLabel(props.player.rank, t, te) : null
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function positionPanel() {
  const el = panel.value;
  const anchor = props.anchor;
  if (!el) return;

  const margin = 8;
  const width = Math.min(22 * 16, window.innerWidth - margin * 2);
  const panelHeight = el.offsetHeight || 280;
  let left = margin;
  let top = margin;

  if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const rect = anchor.getBoundingClientRect();
    left = rect.left + rect.width / 2 - width / 2;
    // Préférer au-dessus du déclencheur ; sinon en dessous.
    const above = rect.top - panelHeight - margin;
    top = above >= margin ? above : rect.bottom + margin;
  } else {
    left = (window.innerWidth - width) / 2;
    top = Math.max(margin, window.innerHeight * 0.12);
  }

  left = clamp(left, margin, window.innerWidth - width - margin);
  top = clamp(top, margin, Math.max(margin, window.innerHeight - panelHeight - margin));

  panelStyle.value = {
    width: `${width}px`,
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
  };
}

function onDocumentPointer(event) {
  if (!props.open) return;
  const target = event.target;
  if (panel.value?.contains(target)) return;
  if (props.anchor && typeof props.anchor.contains === 'function' && props.anchor.contains(target)) {
    return;
  }
  emit('close');
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) emit('close');
}

function onResize() {
  if (props.open) positionPanel();
}

watch(
  () => [props.open, props.player, props.loading, props.anchor],
  async ([isOpen]) => {
    if (!isOpen) return;
    await nextTick();
    positionPanel();
    await nextTick();
    positionPanel();
  }
);

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer, true);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer, true);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="profile-popover"
      role="dialog"
      :aria-modal="false"
      :aria-label="t('community.profileModalTitle')"
      data-testid="player-profile-popover"
      :style="panelStyle"
      @click.stop
    >
      <p v-if="loading" class="profile-popover__status" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="profile-popover__status alert alert--error" role="alert">
        {{ t('community.profileLoadFailed') }}
      </p>
      <NinjaProfileCard
        v-else-if="player"
        :name="player.name"
        :rank="rankLabel"
        :level="player.level"
        :profile="player.profile"
        :faction-id="player.factionId"
        :faction-accent="player.faction?.accentColor"
        :stats="cardStats"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.profile-popover {
  position: fixed;
  z-index: 70;
  max-width: calc(100vw - 1rem);
  max-height: min(36rem, calc(100dvh - 1rem));
  overflow: visible;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  filter: drop-shadow(0 0.65rem 1.25rem rgb(8 10 24 / 0.35));
}

.profile-popover__status {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--color-surface, #1a1d2e);
  border: 1px solid var(--color-line);
}
</style>
