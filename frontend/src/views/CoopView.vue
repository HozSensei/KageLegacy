<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import PageHeader from '../components/ui/PageHeader.vue';
import PlayerIdentityChip from '../components/player/PlayerIdentityChip.vue';
import PlayerProfileModal from '../components/player/PlayerProfileModal.vue';
import bridgeImage from '../assets/illustrations/stone-bridge.webp';
import { useCoopApi } from '../composables/useCoopApi.js';
import { usePublicPlayerModal } from '../composables/usePublicPlayer.js';
import { useMissionsStore } from '../stores/missions.js';
import { useInventoryStore } from '../stores/inventory.js';
import { localizedName } from '../utils/localeContent.js';

defineOptions({ name: 'CoopView' });

const { t, locale } = useI18n();
const router = useRouter();
const missions = useMissionsStore();
const inventory = useInventoryStore();
const {
  open: profileOpen,
  loading: profileLoading,
  error: profileError,
  player: profilePlayer,
  show: showProfile,
  close: closeProfile,
} = usePublicPlayerModal();
const {
  room,
  run,
  busy,
  pollFailed,
  loadMe,
  createRoom,
  joinRoom,
  setupRoom,
  setReady,
  startMission,
  closeRoom,
  reset,
} = useCoopApi();

const code = ref('');
const error = ref('');
const selectedMissionId = ref(null);
const hardMode = ref(false);

const pouchSummary = computed(() => {
  const items = inventory.pouch || [];
  const count = items.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  return { ryos: inventory.pouchRyos || 0, itemCount: count };
});

const isHost = computed(() => room.value?.role === 'host');
const isGuest = computed(() => room.value?.role === 'guest');
const catalog = computed(() => missions.missions || []);

watch(
  run,
  value => {
    if (value?.id && value.state === 'in_progress') {
      router.replace({ name: 'coop-run', params: { id: value.id } });
    }
  },
  { immediate: true }
);

watch(
  () => room.value?.runId,
  runId => {
    if (runId) router.replace({ name: 'coop-run', params: { id: runId } });
  }
);

onMounted(async () => {
  error.value = '';
  try {
    await Promise.all([missions.fetchMissions(), inventory.fetchInventory()]);
    await loadMe();
    if (room.value?.missionId) selectedMissionId.value = room.value.missionId;
  } catch (err) {
    error.value = err.message || t('coop.requestError');
  }
});

async function wrap(fn) {
  if (busy.value) return;
  error.value = '';
  try {
    await fn();
  } catch (err) {
    error.value = err.message || t('coop.requestError');
  }
}

async function onCreate() {
  await wrap(createRoom);
}

async function onJoin() {
  await wrap(() => joinRoom(code.value.toUpperCase()));
}

async function onSetup() {
  if (!room.value || !selectedMissionId.value) return;
  await wrap(() =>
    setupRoom(room.value.id, {
      missionId: Number(selectedMissionId.value),
      hardMode: hardMode.value,
    })
  );
}

async function onReady(ready = true) {
  if (!room.value) return;
  await wrap(() => setReady(room.value.id, ready));
}

async function onStart() {
  if (!room.value) return;
  await wrap(() => startMission(room.value.id));
}

async function onClose() {
  if (!room.value) return;
  await wrap(async () => {
    await closeRoom(room.value.id);
    reset();
  });
}

function leaveLobby() {
  reset();
  code.value = '';
  error.value = '';
}
</script>

<template>
  <div class="page-shell coop" data-testid="coop-page">
    <PageHeader
      tone="leaf"
      :kicker="t('coop.kicker')"
      :title="t('coop.title')"
      :lead="t('coop.lead')"
      :image="bridgeImage"
      image-position="50% 45%"
    />

    <p v-if="pollFailed" class="alert alert--info" role="status">{{ t('coop.pollError') }}</p>
    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>

    <section v-if="!room" class="panel coop__lobby">
      <button
        type="button"
        class="btn-primary"
        data-testid="coop-create"
        :disabled="busy"
        @click="onCreate"
      >
        {{ t('coop.create') }}
      </button>
      <form class="coop__join" @submit.prevent="onJoin">
        <label class="field">
          <span class="field__label">{{ t('coop.codeLabel') }}</span>
          <input
            v-model="code"
            class="input-field"
            maxlength="10"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('coop.codePlaceholder')"
            data-testid="coop-code-input"
          />
        </label>
        <button
          type="submit"
          class="btn-secondary"
          data-testid="coop-join"
          :disabled="busy || !code"
        >
          {{ t('coop.join') }}
        </button>
      </form>
    </section>

    <section v-else class="panel coop__lobby" data-testid="coop-waiting">
      <p role="status">
        {{ t('coop.waitingTeam') }}
        <strong class="coop__code" data-testid="coop-code">{{ room.code }}</strong>
      </p>
      <p class="text-ink-muted">
        {{ isHost ? t('coop.youAreHost') : t('coop.youAreGuest') }}
      </p>
      <div class="coop__mates">
        <PlayerIdentityChip
          v-if="room.host"
          :user-id="room.host.userId"
          :name="room.host.name"
          :profile="room.host.profile"
          :level="room.host.level"
          @open="showProfile"
        />
        <PlayerIdentityChip
          v-if="room.guest"
          :user-id="room.guest.userId"
          :name="room.guest.name"
          :profile="room.guest.profile"
          :level="room.guest.level"
          @open="showProfile"
        />
      </div>

      <div v-if="isHost" class="coop__setup">
        <label class="field">
          <span class="field__label">{{ t('coop.missionLabel') }}</span>
          <select v-model="selectedMissionId" class="input-field" data-testid="coop-mission">
            <option :value="null" disabled>{{ t('coop.pickMission') }}</option>
            <option v-for="m in catalog" :key="m.id" :value="m.id">
              {{ localizedName(m, locale) }} ({{ m.rank }})
            </option>
          </select>
        </label>
        <label class="coop__check">
          <input v-model="hardMode" type="checkbox" />
          {{ t('coop.hardMode') }}
        </label>
        <button
          type="button"
          class="btn-secondary"
          :disabled="busy || !selectedMissionId"
          @click="onSetup"
        >
          {{ t('coop.saveSetup') }}
        </button>
      </div>
      <p v-else class="text-ink-muted">
        {{ room.missionId ? t('coop.missionChosen') : t('coop.waitingHostSetup') }}
      </p>

      <aside class="coop__pouch" data-testid="coop-pouch-panel">
        <span class="field__label">{{ t('combat.pouchPanelTitle') }}</span>
        <p>
          {{ t('combat.pouchPanelSummary', {
            ryos: pouchSummary.ryos,
            items: pouchSummary.itemCount,
          }) }}
        </p>
        <p v-if="inventory.pouchLocked" class="coop__pouch-warn">
          {{
            inventory.pouchLock?.kind === 'coop'
              ? t('inventory.pouchLockedCoop')
              : t('inventory.pouchLockedMission')
          }}
        </p>
        <p v-else class="coop__pouch-warn">{{ t('combat.pouchLossWarning') }}</p>
        <RouterLink to="/inventaire" class="btn-secondary btn-sm">
          {{ inventory.pouchLocked ? t('nav.inventory') : t('combat.preparePouch') }}
        </RouterLink>
      </aside>

      <div v-if="isGuest" class="coop__ready">
        <button
          type="button"
          class="btn-primary"
          :disabled="busy || !room.missionId"
          data-testid="coop-ready"
          @click="onReady(!room.guestReady)"
        >
          {{ room.guestReady ? t('coop.unready') : t('coop.ready') }}
        </button>
      </div>
      <p v-else class="text-ink-muted">
        {{ room.guestReady ? t('coop.guestIsReady') : t('coop.waitingGuestReady') }}
      </p>

      <div class="coop__actions">
        <button
          v-if="isHost"
          type="button"
          class="btn-primary"
          data-testid="coop-start"
          :disabled="busy || room.status !== 'ready'"
          @click="onStart"
        >
          {{ t('coop.startMission') }}
        </button>
        <button type="button" class="btn-ghost" :disabled="busy" @click="onClose">
          {{ t('coop.closeRoom') }}
        </button>
        <button type="button" class="btn-ghost" @click="leaveLobby">
          {{ t('coop.backToLobby') }}
        </button>
      </div>
    </section>

    <PlayerProfileModal
      :open="profileOpen"
      :loading="profileLoading"
      :error="profileError"
      :player="profilePlayer"
      @close="closeProfile"
    />
  </div>
</template>

<style scoped>
.coop__lobby {
  display: grid;
  gap: 1rem;
  max-width: 36rem;
  margin-top: 1.5rem;
}
.coop__mates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}
.coop__join,
.coop__setup,
.coop__pouch,
.coop__actions,
.coop__ready {
  display: grid;
  gap: 0.75rem;
}
.coop__code {
  letter-spacing: 0.08em;
  font-family: ui-monospace, monospace;
}
.coop__pouch-warn {
  margin: 0;
  color: var(--color-vermilion);
  font-size: 0.875rem;
  font-weight: 600;
}
.coop__radio,
.coop__check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
