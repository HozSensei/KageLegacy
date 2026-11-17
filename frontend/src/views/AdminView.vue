<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/ui/PageHeader.vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const { t } = useI18n();
const API_BASE = import.meta.env.VITE_API_URL || '';
const players = ref([]);
const selectedId = ref('');
const search = ref('');
const resources = ref({ ryos: 0, kageCoins: 0, cardDust: 0, cardEssence: 0 });
const resetSelection = ref({
  collection: false,
  combats: false,
  missions: false,
  ryos: false,
  kageCoins: false,
  cardMaterials: false,
  level: false,
  talents: false,
});
const resetOptions = computed(() => [
  { key: 'collection', label: t('admin.players.resetCollection') },
  { key: 'combats', label: t('admin.players.resetCombats') },
  { key: 'missions', label: t('admin.players.resetMissions') },
  { key: 'ryos', label: t('admin.players.resetRyos') },
  { key: 'kageCoins', label: t('admin.players.resetKageCoins') },
  { key: 'cardMaterials', label: t('admin.players.resetCardMaterials') },
  { key: 'level', label: t('admin.players.resetLevel') },
  { key: 'talents', label: t('admin.players.resetTalents') },
]);
const selectedResetLabels = computed(() =>
  resetOptions.value.filter(option => resetSelection.value[option.key]).map(option => option.label)
);
const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const error = ref('');
const notice = ref('');
let searchTimer;

const selectedPlayer = computed(
  () => players.value.find(player => Number(player.id) === Number(selectedId.value)) || null
);

onMounted(() => loadPlayers());
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPlayers, 250);
});

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const { ok, body } = await parseApiResponse(response);
  if (!ok) throw new Error(await readApiError(response, body));
  return body;
}

async function loadPlayers() {
  loading.value = true;
  error.value = '';
  try {
    const query = new URLSearchParams();
    if (search.value.trim()) query.set('q', search.value.trim());
    const result = await request(`/api/admin/players?${query}`);
    players.value = result.players || [];
    if (!players.value.some(player => Number(player.id) === Number(selectedId.value))) {
      selectedId.value = '';
    }
  } catch (cause) {
    error.value = cause.message;
  } finally {
    loading.value = false;
  }
}

async function grantResources() {
  if (!selectedPlayer.value) return;
  const payload = Object.fromEntries(
    Object.entries(resources.value).map(([key, value]) => [key, Number(value) || 0])
  );
  if (!Object.values(payload).some(amount => amount > 0)) {
    error.value = t('admin.players.grantAmountRequired');
    return;
  }

  saving.value = true;
  error.value = '';
  notice.value = '';
  try {
    await request(`/api/admin/players/${selectedPlayer.value.id}/resources`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    resources.value = { ryos: 0, kageCoins: 0, cardDust: 0, cardEssence: 0 };
    await loadPlayers();
    notice.value = t('admin.players.grantSuccess', { name: selectedPlayer.value?.username || '' });
  } catch (cause) {
    error.value = cause.message;
  } finally {
    saving.value = false;
  }
}

async function resetPlayer() {
  if (!selectedPlayer.value) return;
  const playerName = selectedPlayer.value.username;
  if (!selectedResetLabels.value.length) {
    error.value = t('admin.players.resetSelectionRequired');
    return;
  }
  if (selectedPlayer.value.is_admin) {
    error.value = t('admin.players.adminCannotReset');
    return;
  }
  const confirmed = window.confirm(
    `${t('admin.players.resetConfirm', { name: playerName })}\n\n${selectedResetLabels.value.join('\n')}`
  );
  if (!confirmed) return;

  resetting.value = true;
  error.value = '';
  notice.value = '';
  try {
    await request(`/api/admin/players/${selectedPlayer.value.id}/reset`, {
      method: 'POST',
      body: JSON.stringify(resetSelection.value),
    });
    await loadPlayers();
    notice.value = t('admin.players.resetSuccess', { name: playerName });
  } catch (cause) {
    error.value = cause.message;
  } finally {
    resetting.value = false;
  }
}
</script>

<template>
  <div class="page-shell" data-testid="admin-page">
    <PageHeader tone="ink" :title="t('admin.title')" :lead="t('admin.lead')" />

    <p v-if="error" class="alert alert--error mt-6" role="alert">{{ error }}</p>
    <p v-if="notice" class="alert alert--success mt-6" role="status">{{ notice }}</p>

    <section class="panel mt-8" aria-labelledby="admin-player-title">
      <div class="admin-section-heading">
        <div>
          <h2 id="admin-player-title" class="admin-title">{{ t('admin.players.title') }}</h2>
          <p class="admin-lead">{{ t('admin.players.lead') }}</p>
        </div>
        <button type="button" class="btn-ghost" :disabled="loading" @click="loadPlayers">
          {{ t('admin.players.refresh') }}
        </button>
      </div>

      <label class="admin-field mt-5">
        <span>{{ t('admin.players.search') }}</span>
        <input
          v-model="search"
          class="input-field"
          type="search"
          autocomplete="off"
          :placeholder="t('admin.players.searchPlaceholder')"
        />
      </label>

      <label class="admin-field mt-4">
        <span>{{ t('admin.players.select') }}</span>
        <select v-model="selectedId" class="input-field" :disabled="loading">
          <option value="">{{ loading ? t('common.loading') : t('admin.players.choose') }}</option>
          <option v-for="player in players" :key="player.id" :value="String(player.id)">
            {{ player.username }}
            <template v-if="player.is_admin"> — {{ t('admin.players.adminRole') }}</template>
            <template v-else-if="player.character_name"> — {{ player.character_name }}</template>
          </option>
        </select>
      </label>
      <p v-if="!loading && !players.length" class="mt-3 text-sm text-ink-muted">
        {{ t('admin.players.empty') }}
      </p>

      <template v-if="selectedPlayer">
        <div class="admin-player-summary mt-5">
          <div>
            <p class="admin-player-name">{{ selectedPlayer.username }}</p>
            <p class="text-sm text-ink-muted">
              {{ selectedPlayer.character_name || t('admin.players.noCharacter') }}
            </p>
            <span v-if="selectedPlayer.is_admin" class="admin-role-badge">{{
              t('admin.players.adminRole')
            }}</span>
          </div>
          <div class="admin-player-counts">
            <span>{{
              t('admin.players.collectionCount', { count: selectedPlayer.collection_count })
            }}</span>
            <span>{{ t('admin.players.deckCount', { count: selectedPlayer.deck_count }) }}</span>
          </div>
        </div>

        <div class="admin-resources mt-6">
          <article
            v-for="resource in [
              { key: 'ryos', label: t('admin.players.ryos'), current: selectedPlayer.ryos },
              {
                key: 'kageCoins',
                label: t('admin.players.kageCoins'),
                current: selectedPlayer.kage_coins,
              },
              {
                key: 'cardDust',
                label: t('admin.players.cardDust'),
                current: selectedPlayer.card_dust,
              },
              {
                key: 'cardEssence',
                label: t('admin.players.cardEssence'),
                current: selectedPlayer.card_essence,
              },
            ]"
            :key="resource.key"
            class="admin-resource"
          >
            <label class="admin-field">
              <span>{{ resource.label }}</span>
              <input
                v-model.number="resources[resource.key]"
                class="input-field"
                type="number"
                min="0"
                max="1000000000"
                step="1"
              />
            </label>
            <p>{{ t('admin.players.current') }}: {{ Number(resource.current).toLocaleString() }}</p>
          </article>
        </div>
        <p v-if="selectedPlayer.is_admin" class="mt-4 text-sm text-ink-muted">
          {{ t('admin.players.adminCannotReset') }}
        </p>
        <button
          type="button"
          class="btn-primary mt-5"
          :disabled="saving || resetting || selectedPlayer.is_admin"
          @click="grantResources"
        >
          {{ saving ? t('admin.players.granting') : t('admin.players.grant') }}
        </button>

        <div class="admin-reset mt-8">
          <div>
            <h3 class="admin-title">{{ t('admin.players.resetTitle') }}</h3>
            <p class="admin-lead">{{ t('admin.players.resetWarning') }}</p>
            <div class="admin-reset-options mt-4">
              <label v-for="option in resetOptions" :key="option.key" class="admin-check">
                <input
                  v-model="resetSelection[option.key]"
                  type="checkbox"
                  :disabled="selectedPlayer.is_admin || saving || resetting"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
          <button
            type="button"
            class="btn-danger"
            :disabled="saving || resetting || selectedPlayer.is_admin"
            @click="resetPlayer"
          >
            {{ resetting ? t('admin.players.resetting') : t('admin.players.reset') }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.admin-section-heading,
.admin-reset,
.admin-player-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.admin-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
}

.admin-lead {
  max-width: 48rem;
  margin-top: 0.35rem;
  color: var(--color-ink-muted);
  font-size: 0.92rem;
}

.admin-field {
  display: grid;
  gap: 0.4rem;
  max-width: 38rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.admin-player-summary {
  align-items: center;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-ink) 3%, transparent);
}

.admin-player-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.admin-player-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

.admin-resources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: 1rem;
}

.admin-resource p {
  margin-top: 0.35rem;
  color: var(--color-ink-muted);
  font-size: 0.8rem;
}

.admin-reset {
  align-items: center;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-line);
}

.admin-reset-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 0.65rem 1rem;
}

.admin-check {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.admin-check input {
  margin-top: 0.2rem;
  accent-color: var(--color-vermilion);
}

.admin-role-badge {
  display: inline-block;
  margin-top: 0.3rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.btn-danger {
  flex: 0 0 auto;
  padding: 0.65rem 1rem;
  border: 1px solid color-mix(in srgb, #dc2626 55%, transparent);
  background: color-mix(in srgb, #dc2626 12%, transparent);
  color: #b91c1c;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 640px) {
  .admin-section-heading,
  .admin-reset,
  .admin-player-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
