<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parseApiResponse, readApiError } from '../../utils/http.js';

const props = defineProps({
  players: { type: Array, default: () => [] },
  playersLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['refresh-players', 'notice', 'error']);

const { t } = useI18n();
const API_BASE = import.meta.env.VITE_API_URL || '';

const search = ref('');
const selectedId = ref('');
const decks = ref([]);
const decksLoading = ref(false);
const selectedDeckId = ref('');
const branchMode = ref('auto'); // auto | manual
const branchManual = ref('taijutsu');
const strength = ref('moyen');
const ranks = ref(['D', 'C', 'B', 'A']);
const runs = ref(24);
const hardMode = ref(false);
const running = ref(false);
const result = ref(null);
const copying = ref(false);
const copyDone = ref(false);
const meta = ref(null);

const selectedDeck = computed(
  () => decks.value.find(d => Number(d.id) === Number(selectedDeckId.value)) || null
);

const inferredBranch = computed(() => selectedDeck.value?.art?.dominant || 'taijutsu');

const effectiveBranch = computed(() =>
  branchMode.value === 'auto' ? inferredBranch.value : branchManual.value
);

const filteredPlayers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.players;
  return props.players.filter(p => {
    const blob = `${p.username || ''} ${p.email || ''} ${p.character_name || ''}`.toLowerCase();
    return blob.includes(q);
  });
});

const rankOptions = ['D', 'C', 'B', 'A'];
const strengthOptions = ['faible', 'moyen', 'haut'];
const branchOptions = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await parseApiResponse(response);
  if (!response.ok) throw new Error(readApiError(payload) || t('common.error'));
  return payload;
}

async function loadMeta() {
  try {
    meta.value = await request('/api/admin/balance/profiles');
    if (meta.value?.defaultRuns) runs.value = meta.value.defaultRuns;
  } catch (cause) {
    emit('error', cause.message);
  }
}

async function loadDecks() {
  if (!selectedId.value) {
    decks.value = [];
    selectedDeckId.value = '';
    return;
  }
  decksLoading.value = true;
  try {
    const payload = await request(`/api/admin/players/${selectedId.value}/decks`);
    decks.value = payload.decks || [];
    const active = decks.value.find(d => d.isActive) || decks.value[0];
    selectedDeckId.value = active ? String(active.id) : '';
    if (active?.art?.dominant) {
      branchManual.value = active.art.dominant;
    }
  } catch (cause) {
    emit('error', cause.message);
    decks.value = [];
    selectedDeckId.value = '';
  } finally {
    decksLoading.value = false;
  }
}

watch(selectedId, () => {
  result.value = null;
  copyDone.value = false;
  void loadDecks();
});

watch(selectedDeckId, deckId => {
  const deck = decks.value.find(d => Number(d.id) === Number(deckId));
  if (deck?.art?.dominant && branchMode.value === 'auto') {
    branchManual.value = deck.art.dominant;
  }
  result.value = null;
  copyDone.value = false;
});

function toggleRank(rank) {
  if (ranks.value.includes(rank)) {
    if (ranks.value.length === 1) return;
    ranks.value = ranks.value.filter(r => r !== rank);
  } else {
    ranks.value = [...ranks.value, rank];
  }
}

function pct(rate) {
  return `${((Number(rate) || 0) * 100).toFixed(1)}%`;
}

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? Number(n).toFixed(digits) : '—';
}

function verdict(rate) {
  if (rate >= 0.7) return t('admin.balance.verdictEasy');
  if (rate >= 0.35) return t('admin.balance.verdictMixed');
  if (rate >= 0.1) return t('admin.balance.verdictHard');
  return t('admin.balance.verdictBrutal');
}

function formatResultForClipboard(payload) {
  if (!payload) return '';
  const lines = [];
  lines.push('# Kage Legacy — sim missions réelles (équilibrage)');
  lines.push('');
  lines.push(`Joueur: ${payload.player?.username || '—'} (${payload.player?.characterName || 'sans perso'})`);
  lines.push(
    `Deck: ${payload.deck?.name || '—'} (#${payload.deck?.id ?? '—'}, ${payload.deck?.size ?? 0} cartes, actif=${payload.deck?.isActive ? 'oui' : 'non'})`
  );
  lines.push(
    `Voie talents: ${payload.branch}${payload.branchAuto ? ' (auto depuis composition deck)' : ' (override manuel)'}`
  );
  if (payload.inferred?.counts) {
    lines.push(`Composition arts: ${JSON.stringify(payload.inferred.counts)}`);
  }
  lines.push(`Forces testées: ${(payload.strengths || []).join(', ')}`);
  lines.push(`Rangs: ${(payload.ranks || []).join(', ')}`);
  lines.push(`Runs / cellule: ${payload.runsPerCell}`);
  lines.push(`Mode difficile: ${payload.hardMode ? 'oui' : 'non'}`);
  lines.push(
    `Validation deck: ${payload.deck?.validation?.valid ? 'OK' : 'INVALIDE'} ${(payload.deck?.validation?.errors || []).join('; ')}`
  );
  lines.push('');
  lines.push('## Résultats (clearance = runs terminés / total)');
  lines.push('| Force | Rang | Clearance | Combats clear/tentés | HP@fin | Verdict |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of payload.rows || []) {
    lines.push(
      `| ${row.strength} | ${row.rank} | ${pct(row.clearanceRate)} | ${fmt(row.avgCombatsCleared)}/${fmt(row.avgCombatsAttempted)} | ${fmt(row.avgHpAtEnd)} | ${verdict(row.clearanceRate)} |`
    );
  }
  lines.push('');
  const sample = (payload.rows || [])[0];
  if (sample) {
    lines.push(`## Profil exemple (${sample.label || sample.strength})`);
    lines.push(`Niveau profil: ${sample.profileLevel ?? '—'}`);
    lines.push(`Talents: ${(sample.talentCodes || []).join(', ') || 'aucun'}`);
    if (sample.stats) lines.push(`Stats (talents+passifs deck): ${JSON.stringify(sample.stats)}`);
  }
  lines.push('');
  lines.push('## Contexte pour analyse');
  lines.push(
    '- Politique bot: greedy_damage_then_block (≠ joueur humain).'
  );
  lines.push('- Missions: parcours branchés, PV persistants, chakra base 5, main persistante.');
  lines.push(
    '- Pistes design NON live: +5 cartes max deck par rang gagné ; +PV à chaque montée de niveau.'
  );
  lines.push('- Demande: dire si les missions sont réussissables selon profil+deck, et où caler la difficulté.');
  return lines.join('\n');
}

async function runSim() {
  if (!selectedId.value || !selectedDeckId.value) {
    emit('error', t('admin.balance.needPlayerDeck'));
    return;
  }
  if (!ranks.value.length) {
    emit('error', t('admin.balance.needRanks'));
    return;
  }
  running.value = true;
  copyDone.value = false;
  emit('error', '');
  try {
    const payload = await request('/api/admin/balance/mission-sim', {
      method: 'POST',
      body: JSON.stringify({
        userId: Number(selectedId.value),
        deckId: Number(selectedDeckId.value),
        branch: branchMode.value === 'auto' ? null : branchManual.value,
        strengths: strength.value,
        ranks: ranks.value,
        runs: Number(runs.value) || 24,
        hardMode: hardMode.value,
      }),
    });
    result.value = payload;
    emit('notice', t('admin.balance.runSuccess', { count: payload.rows?.length || 0 }));
  } catch (cause) {
    result.value = null;
    emit('error', cause.message);
  } finally {
    running.value = false;
  }
}

async function copyResult() {
  if (!result.value) return;
  const text = formatResultForClipboard(result.value);
  copying.value = true;
  copyDone.value = false;
  try {
    await navigator.clipboard.writeText(text);
    copyDone.value = true;
    emit('notice', t('admin.balance.copySuccess'));
  } catch {
    // Fallback for older browsers / insecure context
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyDone.value = true;
      emit('notice', t('admin.balance.copySuccess'));
    } catch (cause) {
      emit('error', cause.message || t('admin.balance.copyFailed'));
    }
  } finally {
    copying.value = false;
  }
}

onMounted(() => {
  void loadMeta();
  if (!props.players.length) emit('refresh-players');
});
</script>

<template>
  <section class="admin-balance" data-testid="admin-balance-panel" aria-labelledby="admin-balance-title">
    <div class="admin-section-heading">
      <div>
        <h2 id="admin-balance-title" class="admin-title">{{ t('admin.balance.title') }}</h2>
        <p class="admin-lead">{{ t('admin.balance.lead') }}</p>
      </div>
      <button
        type="button"
        class="btn-ghost"
        :disabled="playersLoading"
        @click="emit('refresh-players')"
      >
        {{ t('admin.players.refresh') }}
      </button>
    </div>

    <div class="admin-balance__grid mt-5">
      <label class="admin-field">
        <span>{{ t('admin.players.search') }}</span>
        <input
          v-model="search"
          class="input-field"
          type="search"
          autocomplete="off"
          :placeholder="t('admin.players.searchPlaceholder')"
        />
      </label>

      <label class="admin-field">
        <span>{{ t('admin.balance.player') }}</span>
        <select
          v-model="selectedId"
          class="input-field"
          data-testid="admin-balance-player"
          :disabled="playersLoading"
        >
          <option value="">
            {{ playersLoading ? t('common.loading') : t('admin.players.choose') }}
          </option>
          <option v-for="player in filteredPlayers" :key="player.id" :value="String(player.id)">
            {{ player.username }}
            <template v-if="player.character_name"> — {{ player.character_name }}</template>
          </option>
        </select>
      </label>

      <label class="admin-field">
        <span>{{ t('admin.balance.deck') }}</span>
        <select
          v-model="selectedDeckId"
          class="input-field"
          data-testid="admin-balance-deck"
          :disabled="!selectedId || decksLoading"
        >
          <option value="">
            {{ decksLoading ? t('common.loading') : t('admin.balance.chooseDeck') }}
          </option>
          <option v-for="deck in decks" :key="deck.id" :value="String(deck.id)">
            {{ deck.name }} ({{ deck.size }})
            <template v-if="deck.isActive"> — {{ t('admin.balance.activeDeck') }}</template>
            <template v-if="deck.art?.dominant"> · {{ deck.art.dominant }}</template>
          </option>
        </select>
      </label>

      <div class="admin-field">
        <span>{{ t('admin.balance.branch') }}</span>
        <div class="admin-balance__branch">
          <label class="admin-check">
            <input v-model="branchMode" type="radio" value="auto" />
            {{ t('admin.balance.branchAuto', { branch: inferredBranch }) }}
          </label>
          <label class="admin-check">
            <input v-model="branchMode" type="radio" value="manual" />
            {{ t('admin.balance.branchManual') }}
          </label>
          <select
            v-model="branchManual"
            class="input-field"
            :disabled="branchMode !== 'manual'"
            data-testid="admin-balance-branch"
          >
            <option v-for="b in branchOptions" :key="b" :value="b">
              {{ t(`admin.balance.branches.${b}`) }}
            </option>
          </select>
        </div>
        <p class="admin-hint">
          {{ t('admin.balance.branchHint', { branch: effectiveBranch }) }}
        </p>
      </div>

      <label class="admin-field">
        <span>{{ t('admin.balance.strength') }}</span>
        <select v-model="strength" class="input-field" data-testid="admin-balance-strength">
          <option v-for="s in strengthOptions" :key="s" :value="s">
            {{ t(`admin.balance.strengths.${s}`) }}
          </option>
        </select>
      </label>

      <div class="admin-field">
        <span>{{ t('admin.balance.ranks') }}</span>
        <div class="admin-balance__ranks">
          <label v-for="rank in rankOptions" :key="rank" class="admin-check">
            <input
              type="checkbox"
              :checked="ranks.includes(rank)"
              @change="toggleRank(rank)"
            />
            {{ rank }}
          </label>
        </div>
      </div>

      <label class="admin-field">
        <span>{{ t('admin.balance.runs') }}</span>
        <input
          v-model.number="runs"
          class="input-field"
          type="number"
          min="1"
          max="80"
          data-testid="admin-balance-runs"
        />
      </label>

      <label class="admin-check admin-balance__hard">
        <input v-model="hardMode" type="checkbox" />
        {{ t('admin.balance.hardMode') }}
      </label>
    </div>

    <div class="admin-balance__actions mt-5">
      <button
        type="button"
        class="btn-primary"
        data-testid="admin-balance-run"
        :disabled="running || !selectedId || !selectedDeckId"
        @click="runSim"
      >
        {{ running ? t('admin.balance.running') : t('admin.balance.run') }}
      </button>
      <button
        type="button"
        class="btn-secondary"
        data-testid="admin-balance-copy"
        :disabled="!result || copying"
        @click="copyResult"
      >
        {{
          copying
            ? t('admin.balance.copying')
            : copyDone
              ? t('admin.balance.copied')
              : t('admin.balance.copy')
        }}
      </button>
    </div>

    <p v-if="selectedDeck?.art" class="admin-hint mt-3">
      {{
        t('admin.balance.artBreakdown', {
          counts: Object.entries(selectedDeck.art.counts)
            .filter(([, n]) => n > 0)
            .map(([k, n]) => `${k}:${n}`)
            .join(' · '),
        })
      }}
    </p>

    <div v-if="result" class="admin-balance__results mt-6" data-testid="admin-balance-results">
      <h3 class="admin-title">{{ t('admin.balance.resultsTitle') }}</h3>
      <p class="admin-lead">
        {{
          t('admin.balance.resultsLead', {
            branch: result.branch,
            auto: result.branchAuto
              ? t('admin.balance.autoSuffix')
              : t('admin.balance.manualSuffix'),
            runs: result.runsPerCell,
          })
        }}
      </p>

      <div class="admin-balance__table-wrap mt-4">
        <table class="admin-balance__table">
          <thead>
            <tr>
              <th>{{ t('admin.balance.colStrength') }}</th>
              <th>{{ t('admin.balance.colRank') }}</th>
              <th>{{ t('admin.balance.colClearance') }}</th>
              <th>{{ t('admin.balance.colFights') }}</th>
              <th>{{ t('admin.balance.colHp') }}</th>
              <th>{{ t('admin.balance.colVerdict') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in result.rows" :key="`${row.strength}-${row.rank}-${idx}`">
              <td>{{ row.strength }}</td>
              <td>{{ row.rank }}</td>
              <td>{{ pct(row.clearanceRate) }}</td>
              <td>{{ fmt(row.avgCombatsCleared) }}/{{ fmt(row.avgCombatsAttempted) }}</td>
              <td>{{ fmt(row.avgHpAtEnd) }}</td>
              <td>{{ verdict(row.clearanceRate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="admin-hint mt-3">{{ t('admin.balance.copyHint') }}</p>
    </div>
  </section>
</template>

<style scoped>
.admin-section-heading {
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
  font-size: 0.9rem;
  font-weight: 600;
}

.admin-hint {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  font-weight: 400;
}

.admin-check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.admin-balance__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.admin-balance__branch,
.admin-balance__ranks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  align-items: center;
}

.admin-balance__hard {
  align-self: end;
  margin-bottom: 0.35rem;
}

.admin-balance__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-balance__table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-line);
}

.admin-balance__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.admin-balance__table th,
.admin-balance__table td {
  padding: 0.55rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-line);
  white-space: nowrap;
}

.admin-balance__table th {
  background: color-mix(in srgb, var(--color-ink) 4%, transparent);
  font-weight: 700;
}

@media (max-width: 640px) {
  .admin-section-heading {
    flex-direction: column;
  }
}
</style>
