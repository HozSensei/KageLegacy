<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AdminBalanceSim from '../components/admin/AdminBalanceSim.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { BUG_REPORT_LOCATION_OPTIONS } from '../constants/bugReportLocations.js';
import { parseApiResponse, readApiError } from '../utils/http.js';
import { useAdminBalanceResults } from '../composables/useAdminBalanceResults.js';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const API_BASE = import.meta.env.VITE_API_URL || '';
const initialTab =
  route.query.tab === 'reports'
    ? 'reports'
    : route.query.tab === 'balance'
      ? 'balance'
      : 'players';
const activeTab = ref(initialTab);
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
const freshResetting = ref(false);
const exportingDeck = ref(false);
const error = ref('');
const notice = ref('');
const { clear: clearBalanceResults } = useAdminBalanceResults();
let searchTimer;

const reports = ref([]);
const reportFilter = ref('');
const reportsLoading = ref(false);
const reportSavingId = ref(null);
const reportRewardingId = ref(null);
const reportDrafts = ref({});

const selectedPlayer = computed(
  () => players.value.find(player => Number(player.id) === Number(selectedId.value)) || null
);

function setTab(tab) {
  activeTab.value = tab;
  const query = { ...route.query };
  if (tab === 'reports' || tab === 'balance') query.tab = tab;
  else delete query.tab;
  router.replace({ query });
  if (tab !== 'balance') clearBalanceResults();
  if (tab === 'reports') void loadReports();
  else void loadPlayers();
}

function onBalanceNotice(message) {
  if (!message) return;
  notice.value = message;
  error.value = '';
}

function onBalanceError(message) {
  error.value = message || '';
  if (message) notice.value = '';
}

function locationLabel(report) {
  const option = BUG_REPORT_LOCATION_OPTIONS.find(item => item.value === report.location);
  const base = option ? t(option.labelKey) : report.location;
  if (report.location === 'other' && report.locationOther) {
    return `${base}${t('admin.reports.otherSuffix', { detail: report.locationOther })}`;
  }
  return base;
}

function statusLabel(status) {
  if (status === 'in_progress') return t('admin.reports.statusInProgress');
  if (status === 'fixed') return t('admin.reports.statusFixed');
  return t('admin.reports.statusOpen');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ensureDraft(report) {
  if (!reportDrafts.value[report.id]) {
    reportDrafts.value[report.id] = {
      status: report.status,
      adminComment: report.adminComment || '',
    };
  }
  return reportDrafts.value[report.id];
}

onMounted(() => {
  if (activeTab.value === 'reports') loadReports();
  else loadPlayers();
});
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPlayers, 250);
});
watch(
  () => route.query.tab,
  tab => {
    const next =
      tab === 'reports' ? 'reports' : tab === 'balance' ? 'balance' : 'players';
    if (next !== activeTab.value) {
      activeTab.value = next;
      if (next !== 'balance') clearBalanceResults();
      if (next === 'reports') void loadReports();
      else void loadPlayers();
    }
  }
);

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

async function freshResetPlayer() {
  if (!selectedPlayer.value) return;
  const playerName = selectedPlayer.value.username;
  const confirmed = window.confirm(t('admin.players.freshResetConfirm', { name: playerName }));
  if (!confirmed) return;

  freshResetting.value = true;
  error.value = '';
  notice.value = '';
  try {
    await request(`/api/admin/players/${selectedPlayer.value.id}/reset`, {
      method: 'POST',
      body: JSON.stringify({ freshStart: true }),
    });
    await loadPlayers();
    notice.value = t('admin.players.freshResetSuccess', { name: playerName });
  } catch (cause) {
    error.value = cause.message;
  } finally {
    freshResetting.value = false;
  }
}

async function exportActiveDeck() {
  if (!selectedPlayer.value) return;
  exportingDeck.value = true;
  error.value = '';
  notice.value = '';
  try {
    const payload = await request(
      `/api/admin/players/${selectedPlayer.value.id}/active-deck-export`
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeUser = String(selectedPlayer.value.username || selectedPlayer.value.id).replace(
      /[^\w-]+/g,
      '_'
    );
    const safeDeck = String(payload.deck?.name || 'deck')
      .replace(/[^\w-]+/g, '_')
      .slice(0, 40);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-${safeUser}-${safeDeck}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notice.value = t('admin.players.exportDeckSuccess', {
      name: selectedPlayer.value.username,
      deck: payload.deck?.name || '',
      count: payload.deck?.size ?? 0,
    });
  } catch (cause) {
    error.value = cause.message;
  } finally {
    exportingDeck.value = false;
  }
}

async function loadReports() {
  reportsLoading.value = true;
  error.value = '';
  try {
    const query = new URLSearchParams();
    if (reportFilter.value) query.set('status', reportFilter.value);
    const result = await request(`/api/admin/bug-reports?${query}`);
    reports.value = result.reports || [];
    reportDrafts.value = {};
    for (const report of reports.value) ensureDraft(report);
  } catch (cause) {
    error.value = cause.message;
  } finally {
    reportsLoading.value = false;
  }
}

async function saveReport(report) {
  const draft = ensureDraft(report);
  reportSavingId.value = report.id;
  error.value = '';
  notice.value = '';
  try {
    const result = await request(`/api/admin/bug-reports/${report.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: draft.status,
        adminComment: draft.adminComment || null,
      }),
    });
    const updated = result.report;
    reports.value = reports.value.map(item => (item.id === updated.id ? updated : item));
    reportDrafts.value[updated.id] = {
      status: updated.status,
      adminComment: updated.adminComment || '',
    };
    notice.value = t('admin.reports.updateSuccess');
  } catch (cause) {
    error.value = cause.message;
  } finally {
    reportSavingId.value = null;
  }
}

async function rewardReport(report) {
  if (report.rewardedAt) return;
  const confirmed = window.confirm(
    t('admin.reports.rewardConfirm', { name: report.authorName || report.username || '' })
  );
  if (!confirmed) return;
  reportRewardingId.value = report.id;
  error.value = '';
  notice.value = '';
  try {
    await request(`/api/admin/bug-reports/${report.id}/reward`, { method: 'POST' });
    await loadReports();
    notice.value = t('admin.reports.rewardSuccess', {
      name: report.authorName || report.username || '',
    });
  } catch (cause) {
    error.value = cause.message;
  } finally {
    reportRewardingId.value = null;
  }
}
</script>

<template>
  <div class="page-shell" data-testid="admin-page">
    <PageHeader tone="ink" :title="t('admin.title')" :lead="t('admin.lead')" />

    <p v-if="error" class="alert alert--error mt-6" role="alert">{{ error }}</p>
    <p v-if="notice" class="alert alert--success mt-6" role="status">{{ notice }}</p>

    <div class="tabs mt-8" role="tablist" :aria-label="t('admin.title')">
      <button
        type="button"
        role="tab"
        class="tab"
        :aria-selected="activeTab === 'players'"
        data-testid="admin-tab-players"
        @click="setTab('players')"
      >
        {{ t('admin.tabs.players') }}
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :aria-selected="activeTab === 'balance'"
        data-testid="admin-tab-balance"
        @click="setTab('balance')"
      >
        {{ t('admin.tabs.balance') }}
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :aria-selected="activeTab === 'reports'"
        data-testid="admin-tab-reports"
        @click="setTab('reports')"
      >
        {{ t('admin.tabs.reports') }}
      </button>
    </div>

    <section v-show="activeTab === 'balance'" class="panel mt-6">
      <AdminBalanceSim
        :players="players"
        :players-loading="loading"
        @refresh-players="loadPlayers"
        @notice="onBalanceNotice"
        @error="onBalanceError"
      />
    </section>

    <section
      v-show="activeTab === 'players'"
      class="panel mt-6"
      aria-labelledby="admin-player-title"
    >
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
            <template v-if="player.email"> ({{ player.email }})</template>
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
            <p v-if="selectedPlayer.email" class="text-sm text-ink-muted">
              {{ selectedPlayer.email }}
            </p>
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

        <div class="admin-export mt-6">
          <h3 class="admin-title">{{ t('admin.players.exportDeckTitle') }}</h3>
          <p class="admin-lead">{{ t('admin.players.exportDeckLead') }}</p>
          <button
            type="button"
            class="btn btn-secondary mt-3"
            data-testid="admin-export-active-deck"
            :disabled="exportingDeck"
            @click="exportActiveDeck"
          >
            {{
              exportingDeck
                ? t('admin.players.exportDeckBusy')
                : t('admin.players.exportDeck')
            }}
          </button>
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
        <button
          type="button"
          class="btn-primary mt-5"
          :disabled="saving || resetting || freshResetting"
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
                  :disabled="saving || resetting || freshResetting"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
          <button
            type="button"
            class="btn-danger"
            :disabled="saving || resetting || freshResetting"
            @click="resetPlayer"
          >
            {{ resetting ? t('admin.players.resetting') : t('admin.players.reset') }}
          </button>
        </div>

        <div class="admin-reset mt-8">
          <div>
            <h3 class="admin-title">{{ t('admin.players.freshResetTitle') }}</h3>
            <p class="admin-lead">{{ t('admin.players.freshResetWarning') }}</p>
          </div>
          <button
            type="button"
            class="btn-danger"
            :disabled="saving || resetting || freshResetting"
            data-testid="admin-fresh-reset"
            @click="freshResetPlayer"
          >
            {{
              freshResetting
                ? t('admin.players.freshResetting')
                : t('admin.players.freshReset')
            }}
          </button>
        </div>
      </template>
    </section>

    <section
      v-show="activeTab === 'reports'"
      class="panel mt-6"
      aria-labelledby="admin-reports-title"
      data-testid="admin-reports-panel"
    >
      <div class="admin-section-heading">
        <div>
          <h2 id="admin-reports-title" class="admin-title">{{ t('admin.reports.title') }}</h2>
          <p class="admin-lead">{{ t('admin.reports.lead') }}</p>
        </div>
        <button type="button" class="btn-ghost" :disabled="reportsLoading" @click="loadReports">
          {{ t('admin.reports.refresh') }}
        </button>
      </div>

      <label class="admin-field mt-5">
        <span>{{ t('admin.reports.filter') }}</span>
        <select
          v-model="reportFilter"
          class="input-field"
          data-testid="admin-reports-filter"
          @change="loadReports"
        >
          <option value="">{{ t('admin.reports.filterAll') }}</option>
          <option value="open">{{ t('admin.reports.statusOpen') }}</option>
          <option value="in_progress">{{ t('admin.reports.statusInProgress') }}</option>
          <option value="fixed">{{ t('admin.reports.statusFixed') }}</option>
        </select>
      </label>

      <p v-if="reportsLoading" class="mt-4 text-sm text-ink-muted">{{ t('common.loading') }}</p>
      <p v-else-if="!reports.length" class="mt-4 text-sm text-ink-muted">
        {{ t('admin.reports.empty') }}
      </p>

      <div v-else class="admin-reports-list mt-5">
        <article
          v-for="report in reports"
          :key="report.id"
          class="admin-report"
          :data-testid="`admin-report-${report.id}`"
        >
          <header class="admin-report__head">
            <div>
              <p class="admin-report__meta">
                {{ formatDate(report.createdAt) }} · {{ report.authorName }}
              </p>
              <p class="admin-report__location">{{ locationLabel(report) }}</p>
            </div>
            <span class="admin-role-badge">{{ statusLabel(report.status) }}</span>
          </header>
          <p class="admin-report__desc">{{ report.description }}</p>
          <div class="admin-report__actions">
            <label class="admin-field">
              <span>{{ t('admin.reports.colStatus') }}</span>
              <select v-model="reportDrafts[report.id].status" class="input-field">
                <option value="open">{{ t('admin.reports.statusOpen') }}</option>
                <option value="in_progress">{{ t('admin.reports.statusInProgress') }}</option>
                <option value="fixed">{{ t('admin.reports.statusFixed') }}</option>
              </select>
            </label>
            <label class="admin-field admin-field--wide">
              <span>{{ t('admin.reports.comment') }}</span>
              <textarea
                v-model="reportDrafts[report.id].adminComment"
                class="input-field"
                rows="2"
                :placeholder="t('admin.reports.commentPlaceholder')"
              />
            </label>
            <div class="admin-report__buttons">
              <button
                type="button"
                class="btn-secondary"
                :disabled="reportSavingId === report.id"
                @click="saveReport(report)"
              >
                {{
                  reportSavingId === report.id
                    ? t('admin.reports.saving')
                    : t('admin.reports.save')
                }}
              </button>
              <button
                type="button"
                class="btn-primary"
                :disabled="Boolean(report.rewardedAt) || reportRewardingId === report.id"
                @click="rewardReport(report)"
              >
                {{
                  report.rewardedAt
                    ? t('admin.reports.rewarded')
                    : reportRewardingId === report.id
                      ? t('admin.reports.rewarding')
                      : t('admin.reports.reward')
                }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-section-heading,
.admin-export,
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

.admin-reports-list {
  display: grid;
  gap: 1rem;
}

.admin-report {
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-line);
}

.admin-report__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.admin-report__meta {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

.admin-report__location {
  margin-top: 0.2rem;
  font-weight: 600;
}

.admin-report__desc {
  margin-top: 0.75rem;
  white-space: pre-wrap;
  font-size: 0.95rem;
}

.admin-report__actions {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.admin-field--wide {
  max-width: none;
}

.admin-report__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .admin-section-heading,
  .admin-export,
  .admin-reset,
  .admin-player-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
