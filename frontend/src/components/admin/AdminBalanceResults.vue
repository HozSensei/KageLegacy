<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  payload: { type: Object, default: null },
});

const { t } = useI18n();

const RANK_ORDER = Object.freeze({ D: 0, C: 1, B: 2, A: 3 });

const rows = computed(() => {
  const payload = props.payload;
  if (!payload) return [];
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.body?.rows)) return payload.body.rows;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;
  return [];
});

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

const assessment = computed(() => {
  const list = rows.value;
  if (!list.length) return null;

  const ordered = [...list].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
  const rates = ordered.map(r => Number(r.clearanceRate) || 0);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const rateOf = rank => {
    const row = ordered.find(r => r.rank === rank);
    return row == null ? null : Number(row.clearanceRate) || 0;
  };
  const dRate = rateOf('D');
  const aRate = rateOf('A');

  let drops = 0;
  let rises = 0;
  for (let i = 1; i < rates.length; i += 1) {
    const delta = rates[i] - rates[i - 1];
    if (delta < -0.05) drops += 1;
    else if (delta > 0.05) rises += 1;
  }

  if (max < 0.1) return { code: 'tooHard', tone: 'bad', detail: { max: pct(max) } };
  if (min >= 0.7) return { code: 'tooEasy', tone: 'warn', detail: { min: pct(min) } };
  if (rises > drops && rises > 0) return { code: 'inverted', tone: 'bad' };

  for (let i = 1; i < rates.length; i += 1) {
    if (rates[i - 1] >= 0.35 && rates[i] < 0.05) {
      return {
        code: 'cliff',
        tone: 'warn',
        detail: {
          from: ordered[i - 1].rank,
          to: ordered[i].rank,
          fromRate: pct(rates[i - 1]),
          toRate: pct(rates[i]),
        },
      };
    }
  }

  if (rates.length > 1 && max - min < 0.12) {
    return { code: 'flat', tone: 'warn', detail: { spread: pct(max - min) } };
  }

  const dOk = dRate == null || dRate >= 0.35;
  const aChallenging = aRate == null || aRate <= 0.55;
  if (drops >= rises && dOk && aChallenging) {
    return {
      code: 'balanced',
      tone: 'ok',
      detail: {
        d: dRate == null ? '—' : pct(dRate),
        a: aRate == null ? '—' : pct(aRate),
      },
    };
  }

  if (dRate != null && dRate < 0.2) {
    return { code: 'entryTooHard', tone: 'bad', detail: { d: pct(dRate) } };
  }
  if (aRate != null && aRate >= 0.7) {
    return { code: 'endTooEasy', tone: 'warn', detail: { a: pct(aRate) } };
  }

  return { code: 'mixed', tone: 'mixed' };
});

const assessmentLabel = computed(() => {
  const a = assessment.value;
  if (!a) return '';
  return t(`admin.balance.assess.${a.code}`, a.detail || {});
});
</script>

<template>
  <div
    v-if="rows.length"
    class="admin-balance-results"
    data-testid="admin-balance-results"
  >
    <h3 class="admin-balance-results__title">{{ t('admin.balance.resultsTitle') }}</h3>
    <p v-if="payload" class="admin-balance-results__lead">
      {{
        t('admin.balance.resultsLead', {
          branch: payload.branch,
          auto: payload.branchAuto
            ? t('admin.balance.autoSuffix')
            : t('admin.balance.manualSuffix'),
          runs: payload.runsPerCell,
        })
      }}
    </p>

    <p
      v-if="assessment"
      class="admin-balance-results__assess"
      :data-tone="assessment.tone"
      data-testid="admin-balance-assess"
      role="status"
    >
      <span class="admin-balance-results__assess-label">{{ t('admin.balance.assessLabel') }}</span>
      {{ assessmentLabel }}
    </p>

    <!-- Liste toujours visible (pas de display:none selon viewport). -->
    <ul class="admin-balance-results__list" data-testid="admin-balance-cards">
      <li v-for="(row, idx) in rows" :key="`${row.strength}-${row.rank}-${idx}`">
        <p class="admin-balance-results__row-title">
          {{ row.strength }} · {{ t('admin.balance.colRank') }} {{ row.rank }}
        </p>
        <dl class="admin-balance-results__stats">
          <div>
            <dt>{{ t('admin.balance.colClearance') }}</dt>
            <dd>{{ pct(row.clearanceRate) }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.balance.colFights') }}</dt>
            <dd>{{ fmt(row.avgCombatsCleared) }}/{{ fmt(row.avgCombatsAttempted) }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.balance.colHp') }}</dt>
            <dd>{{ fmt(row.avgHpAtEnd) }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.balance.colVerdict') }}</dt>
            <dd>{{ verdict(row.clearanceRate) }}</dd>
          </div>
        </dl>
      </li>
    </ul>

    <div class="admin-balance-results__table-wrap">
      <table class="admin-balance-results__table">
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
          <tr v-for="(row, idx) in rows" :key="`t-${row.strength}-${row.rank}-${idx}`">
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

    <p class="admin-balance-results__hint">{{ t('admin.balance.copyHint') }}</p>
  </div>
</template>

<style scoped>
.admin-balance-results {
  width: 100%;
  min-width: 0;
  margin-top: 1.25rem;
  padding: 1rem 0 0;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink);
}

.admin-balance-results__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-ink);
}

.admin-balance-results__lead {
  max-width: 48rem;
  margin: 0.35rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.92rem;
}

.admin-balance-results__assess {
  margin: 1rem 0 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--color-line);
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
}

.admin-balance-results__assess-label {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--color-ink-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.admin-balance-results__assess[data-tone='ok'] {
  border-color: color-mix(in srgb, #15803d 45%, var(--color-line));
  background: color-mix(in srgb, #15803d 10%, transparent);
}

.admin-balance-results__assess[data-tone='warn'] {
  border-color: color-mix(in srgb, #a16207 45%, var(--color-line));
  background: color-mix(in srgb, #a16207 10%, transparent);
}

.admin-balance-results__assess[data-tone='bad'] {
  border-color: color-mix(in srgb, #b91c1c 45%, var(--color-line));
  background: color-mix(in srgb, #b91c1c 10%, transparent);
}

.admin-balance-results__assess[data-tone='mixed'] {
  border-color: color-mix(in srgb, var(--color-ink) 25%, var(--color-line));
  background: color-mix(in srgb, var(--color-ink) 4%, transparent);
}

.admin-balance-results__list {
  display: grid;
  gap: 0.75rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.admin-balance-results__list > li {
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-ink) 3%, transparent);
}

.admin-balance-results__row-title {
  margin: 0 0 0.55rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-ink);
}

.admin-balance-results__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem 0.75rem;
  margin: 0;
}

.admin-balance-results__stats dt {
  color: var(--color-ink-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.admin-balance-results__stats dd {
  margin: 0.15rem 0 0;
  color: var(--color-ink);
  font-size: 0.92rem;
  font-weight: 600;
}

.admin-balance-results__table-wrap {
  display: none;
  width: 100%;
  min-width: 0;
  margin-top: 1rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--color-line);
}

.admin-balance-results__table {
  width: 100%;
  min-width: 32rem;
  border-collapse: collapse;
  font-size: 0.9rem;
  color: var(--color-ink);
}

.admin-balance-results__table th,
.admin-balance-results__table td {
  padding: 0.55rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-line);
  white-space: nowrap;
}

.admin-balance-results__table th {
  background: color-mix(in srgb, var(--color-ink) 4%, transparent);
  font-weight: 700;
}

.admin-balance-results__hint {
  margin: 0.85rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

@media (min-width: 720px) {
  .admin-balance-results__list {
    display: none;
  }

  .admin-balance-results__table-wrap {
    display: block;
  }
}
</style>
