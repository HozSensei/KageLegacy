<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const operation = ref(null)
const showMechanical = ref(false)
let pollTimer = null

async function fetchOperation() {
  try {
    const res = await fetch(`${API_BASE}/api/operation/live`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    operation.value = await res.json()
    error.value = null
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function schedulePoll() {
  clearInterval(pollTimer)
  if (operation.value?.state === 'live') {
    pollTimer = setInterval(fetchOperation, 30000)
  }
}

watch(
  () => operation.value?.state,
  () => schedulePoll()
)

const chronicleText = computed(() =>
  (operation.value?.chronicle || []).map((s) => s.text).join('\n\n')
)

const resultLabel = computed(() => {
  const m = operation.value?.match
  if (!m || m.result === 'pending') return null
  const map = {
    home_win: m.isHome ? t('operation.victory') : t('operation.defeat'),
    away_win: m.isHome ? t('operation.defeat') : t('operation.victory'),
    draw: t('operation.draw'),
  }
  return map[m.result]
})

onMounted(async () => {
  await fetchOperation()
  schedulePoll()
})

onUnmounted(() => clearInterval(pollTimer))
</script>

<template>
  <div class="page-shell">
    <header>
      <p class="page-kicker">{{ t('operation.kicker') }}</p>
      <h1 class="page-title mt-3">{{ t('nav.operation') }}</h1>
      <p class="page-lead">{{ t('operation.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('operation.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="operation">
      <p
        v-if="operation.state === 'scheduled'"
        class="mt-10 border-l-2 border-line pl-4 text-sm text-ink-muted"
      >
        {{ t('operation.scheduled', { opponent: operation.match?.opponentSensei }) }}
      </p>

      <p
        v-else-if="operation.state === 'waiting' || operation.state === 'simulating'"
        class="mt-10 border-l-2 border-line pl-4 text-sm text-ink-muted"
      >
        {{ t('operation.waiting') }}
      </p>

      <div v-else class="mt-12 lg:grid lg:grid-cols-12 lg:gap-12">
        <article class="lg:col-span-8">
          <h2 class="font-display text-xl text-ink">{{ t('operation.reportTitle') }}</h2>

          <div v-if="resultLabel" class="mt-4 text-sm uppercase tracking-[0.14em] text-accent">
            {{ resultLabel }}
            <span v-if="operation.match" class="text-ink-faint">
              · {{ operation.match.homeScore }} – {{ operation.match.awayScore }}
            </span>
          </div>

          <div class="chronicle mt-8 whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">
            {{ chronicleText || t('operation.noChronicle') }}
          </div>

          <p
            v-if="operation.suspense"
            class="mt-8 border-l-2 border-accent/40 pl-4 text-sm italic text-ink-faint"
          >
            {{ operation.suspense }}
          </p>

          <section v-if="operation.debriefing?.length" class="mt-14 border-t border-line pt-10">
            <p class="section-label">{{ t('operation.debriefTitle') }}</p>
            <ul class="mt-6 space-y-4">
              <li
                v-for="(alert, idx) in operation.debriefing"
                :key="idx"
                class="text-sm leading-relaxed text-ink-muted"
              >
                {{ alert.text }}
              </li>
            </ul>
          </section>
        </article>

        <aside class="mt-12 lg:col-span-4 lg:mt-0">
          <button
            type="button"
            class="btn-ghost w-full"
            @click="showMechanical = !showMechanical"
          >
            {{ showMechanical ? t('operation.hideMechanical') : t('operation.showMechanical') }}
          </button>

          <div
            v-if="showMechanical && operation.mechanical"
            class="mt-6 border border-line bg-bg-soft p-5 text-sm"
          >
            <dl class="space-y-4">
              <div>
                <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {{ t('operation.possession') }}
                </dt>
                <dd class="mt-1 text-ink-muted">
                  {{ operation.mechanical.possession?.homePct }}% /
                  {{ operation.mechanical.possession?.awayPct }}%
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {{ t('operation.remainingPower') }}
                </dt>
                <dd class="mt-1 text-ink-muted">
                  {{ operation.mechanical.homeScorePct }}% /
                  {{ operation.mechanical.awayScorePct }}%
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {{ t('operation.endingTour') }}
                </dt>
                <dd class="mt-1 text-ink-muted">{{ operation.mechanical.endingTour }} / 12</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
