<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const store = useSquadStore()
const treatingId = ref(null)
const localError = ref(null)

const candidates = computed(() => store.dispensaryCandidates || [])

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
  <section v-if="candidates.length" class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.dispensary.title') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-faint">{{ t('bureau.dispensary.lead') }}</p>

    <p v-if="localError" class="mt-4 text-xs text-fire">{{ localError }}</p>

    <ul class="mt-6 space-y-4">
      <li
        v-for="ninja in candidates"
        :key="ninja.id"
        class="flex flex-wrap items-baseline justify-between gap-3 border border-line/80 p-4"
      >
        <div>
          <p class="font-display text-lg text-ink">{{ ninja.name.split(' ')[0] }}</p>
          <p class="mt-1 text-[11px] text-ink-faint">
            {{ t('bureau.dispensary.forme') }} · {{ ninja.grade }}
          </p>
        </div>
        <button
          type="button"
          class="btn-ghost text-[10px]"
          :disabled="treatingId === ninja.id"
          @click="treat(ninja.id)"
        >
          {{
            treatingId === ninja.id
              ? t('bureau.dispensary.sending')
              : t('bureau.dispensary.submit', { cost: ninja.cost })
          }}
        </button>
      </li>
    </ul>
  </section>
</template>
