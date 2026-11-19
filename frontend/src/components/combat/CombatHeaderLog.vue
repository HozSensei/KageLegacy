<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import CombatLog from './CombatLog.vue';

defineOptions({ name: 'CombatHeaderLog' });

defineProps({
  logs: { type: Array, default: () => [] },
  viewerSeat: { type: String, default: null },
});

const { t } = useI18n();
const panelId = `combat-header-log-${useId()}`;
const headerTarget = shallowRef(null);
const root = ref(null);
const trigger = ref(null);
const panel = ref(null);
const open = ref(false);
let targetObserver;

function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}

async function toggle() {
  if (open.value) {
    close(true);
    return;
  }
  open.value = true;
  await nextTick();
  if (open.value) panel.value?.focus();
}

function dismissOutside(event) {
  if (open.value && !event.composedPath().includes(root.value)) close();
}

function onEscape(event) {
  if (!open.value) return;
  event.preventDefault();
  event.stopPropagation();
  close(true);
}

function syncHeaderTarget() {
  if (headerTarget.value?.isConnected) return;
  const target = document.getElementById('combat-header-tools');
  if (target === headerTarget.value) return;
  close();
  headerTarget.value = target;
}

onMounted(() => {
  syncHeaderTarget();
  // The layout or auth state can supply (or remove) the host after this component mounts.
  targetObserver = new MutationObserver(syncHeaderTarget);
  targetObserver.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('pointerdown', dismissOutside, true);
  document.addEventListener('focusin', dismissOutside, true);
});

onBeforeUnmount(() => {
  targetObserver?.disconnect();
  document.removeEventListener('pointerdown', dismissOutside, true);
  document.removeEventListener('focusin', dismissOutside, true);
});
</script>

<template>
  <Teleport :to="headerTarget" :disabled="!headerTarget">
    <div
      ref="root"
      class="combat-header-log"
      :class="{ 'combat-header-log--in-header': headerTarget }"
      @keydown.esc="onEscape"
    >
      <button
        ref="trigger"
        type="button"
        class="btn-icon combat-header-log__trigger"
        :aria-label="t('combat.logTitle')"
        :title="t('combat.logTitle')"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :aria-controls="panelId"
        data-testid="combat-header-log-trigger"
        @click="toggle"
      >
        <AppIcon name="journal" aria-hidden="true" />
      </button>

      <div
        v-show="open"
        :id="panelId"
        ref="panel"
        class="combat-header-log__panel"
        role="dialog"
        :aria-label="t('combat.logTitle')"
        tabindex="-1"
        data-testid="combat-header-log-panel"
      >
        <CombatLog v-if="open" :logs="logs" :viewer-seat="viewerSeat" tabindex="0" />
        <div class="combat-header-log__actions">
          <button type="button" class="btn-ghost btn-sm" @click="close(true)">
            {{ t('common.dismiss') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.combat-header-log__trigger {
  border: 1px solid var(--color-line-strong);
}

.combat-header-log__trigger[aria-expanded='true'] {
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.combat-header-log__panel {
  width: 24rem;
  max-width: 100%;
  margin-block-start: 0.4rem;
  padding: 0.35rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.combat-header-log--in-header .combat-header-log__panel {
  position: absolute;
  inset-block-start: 100%;
  inset-inline-end: var(--space-gutter);
  z-index: 40;
  max-width: calc(100% - 2 * var(--space-gutter));
}

.combat-header-log__panel :deep(.combat-log) {
  max-height: min(24rem, 60dvh);
  overscroll-behavior: contain;
  overflow-wrap: anywhere;
}

.combat-header-log__actions {
  display: flex;
  justify-content: flex-end;
  padding-block-start: 0.35rem;
}
</style>
