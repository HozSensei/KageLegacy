<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'

const { t } = useI18n()
const store = useSquadStore()
const treatingId = ref(null)
const localError = ref(null)

const candidates = computed(() => store.dispensaryCandidates || [])
const treatableCandidates = computed(() => candidates.value.filter((ninja) => ninja.treatable))
const debtBlocked = computed(
  () => (store.sensei?.ryos ?? 0) < 0 || store.sensei?.salaryDebt
)

async function treat(ninjaId) {
  treatingId.value = ninjaId
  localError.value = null
  try {
    await store.treatAtDispensary(ninjaId)
  } catch (e) {
    localError.value = e.message
  } finally {
    treatingId.value = null
  }
}
</script>

<template>
  <section class="mt-10 border-t border-line pt-8" data-testid="bureau-hospital-panel">
    <p class="section-label">{{ t('bureau.hospital.title') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-faint">{{ t('bureau.hospital.lead') }}</p>

    <p v-if="debtBlocked" class="mt-4 text-xs text-fire">{{ t('bureau.hospital.debtBlocked') }}</p>
    <p v-else-if="!treatableCandidates.length" class="mt-4 text-xs text-ink-muted">
      {{ t('bureau.hospital.empty') }}
    </p>

    <p v-if="localError" class="mt-4 text-xs text-fire">{{ localError }}</p>

    <ul v-if="treatableCandidates.length" class="mt-6 space-y-4">
      <li
        v-for="ninja in treatableCandidates"
        :key="ninja.id"
        class="flex flex-wrap items-baseline justify-between gap-3 border border-line/80 p-4"
      >
        <div>
          <NinjaListIdentity :ninja="ninja" compact first-name-only />
          <p v-if="ninja.baseCost > ninja.cost" class="mt-1 text-[10px] text-ink-faint">
            <span class="line-through">{{ ninja.baseCost }}</span>
            <span class="ml-1 text-accent">{{ ninja.cost }} Ryos</span>
          </p>
        </div>
        <button
          type="button"
          class="btn-ghost text-[10px]"
          :disabled="treatingId === ninja.id || debtBlocked"
          @click="treat(ninja.id)"
        >
          {{
            treatingId === ninja.id
              ? t('bureau.hospital.sending')
              : t('bureau.hospital.submit', { cost: ninja.cost })
          }}
        </button>
      </li>
    </ul>

    <ul v-if="candidates.length > treatableCandidates.length" class="mt-4 space-y-2 text-xs text-ink-faint">
      <li v-for="ninja in candidates.filter((n) => !n.treatable)" :key="`locked-${ninja.id}`">
        {{ ninja.name.split(' ')[0] }} — {{ t('bureau.hospital.medLock') }}
      </li>
    </ul>
  </section>
</template>
