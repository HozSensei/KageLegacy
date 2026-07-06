<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  nav: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const cycles = computed(() => {
  if (!props.nav?.pool) return []
  const max = 10
  return Array.from({ length: max }, (_, i) => i + 1)
})

function poolLabel(pool) {
  const tag = pool.isViewerPool ? t('matches.yourPool') : ''
  return `${t('matches.division')} ${pool.division} · S${pool.season}${tag ? ` (${tag})` : ''}`
}

function goPool(poolId) {
  router.push({
    name: 'operation',
    query: { poolId, cycle: props.nav?.cycle ?? undefined },
  })
}

function goCycle(cycle) {
  router.push({
    name: 'operation',
    query: { ...route.query, poolId: props.nav?.poolId, cycle },
  })
}

function goMatch(matchId) {
  router.push({
    name: 'operation-match',
    params: { matchId },
    query: { poolId: props.nav?.poolId, cycle: props.nav?.cycle },
  })
}

function goPrev() {
  if (props.nav?.prevMatchId) goMatch(props.nav.prevMatchId)
}

function goNext() {
  if (props.nav?.nextMatchId) goMatch(props.nav.nextMatchId)
}

function matchStatusClass(status) {
  if (status === 'revealing' || status === 'simulated') return 'text-accent'
  if (status === 'applied') return 'text-ink-muted'
  return 'text-ink-faint'
}
</script>

<template>
  <nav class="border border-line bg-bg-soft p-5" aria-label="Match navigation">
    <p class="section-label">{{ t('matches.navTitle') }}</p>

    <label class="mt-4 block text-[10px] uppercase tracking-[0.12em] text-ink-faint">
      {{ t('matches.pool') }}
      <select
        class="mt-2 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
        :disabled="loading || !nav?.pools?.length"
        :value="nav?.poolId ?? ''"
        @change="goPool(Number($event.target.value))"
      >
        <option v-for="pool in nav?.pools || []" :key="pool.id" :value="pool.id">
          {{ poolLabel(pool) }}
        </option>
      </select>
    </label>

    <div v-if="nav?.pool" class="mt-5">
      <p class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{{ t('matches.cycle') }}</p>
      <div class="mt-2 flex flex-wrap gap-1">
        <button
          v-for="c in cycles"
          :key="c"
          type="button"
          class="min-w-[2rem] px-2 py-1 text-xs transition"
          :class="
            nav.cycle === c
              ? 'bg-accent text-bg'
              : 'border border-line text-ink-muted hover:border-ink-faint'
          "
          @click="goCycle(c)"
        >
          {{ c }}
        </button>
      </div>
    </div>

    <ul class="mt-5 space-y-2">
      <li
        v-for="match in nav?.matches || []"
        :key="match.id"
      >
        <button
          type="button"
          class="w-full border px-3 py-2 text-left text-sm transition"
          :class="
            nav?.matchId === match.id
              ? 'border-accent bg-bg text-ink'
              : 'border-line text-ink-muted hover:border-ink-faint'
          "
          @click="goMatch(match.id)"
        >
          <span class="block font-display text-ink">
            {{ match.home.name }}
            <span class="text-ink-faint">vs</span>
            {{ match.away.name }}
          </span>
          <span class="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em]">
            <span :class="matchStatusClass(match.status)">{{ t(`matches.status.${match.status}`, match.status) }}</span>
            <span v-if="match.isParticipant" class="text-accent">{{ t('matches.yourMatch') }}</span>
            <span v-if="match.hasChronicle && match.homeScore != null" class="text-ink-faint">
              {{ match.homeScore }}:{{ match.awayScore }}
            </span>
          </span>
        </button>
      </li>
      <li v-if="!nav?.matches?.length" class="text-xs text-ink-faint">
        {{ t('matches.noFixtures') }}
      </li>
    </ul>

    <div v-if="nav?.prevMatchId || nav?.nextMatchId" class="mt-5 flex gap-2">
      <button
        type="button"
        class="btn-ghost flex-1 text-xs"
        :disabled="!nav?.prevMatchId"
        @click="goPrev"
      >
        ← {{ t('matches.prev') }}
      </button>
      <button
        type="button"
        class="btn-ghost flex-1 text-xs"
        :disabled="!nav?.nextMatchId"
        @click="goNext"
      >
        {{ t('matches.next') }} →
      </button>
    </div>
  </nav>
</template>
