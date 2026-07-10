<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  dossier: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update-posture'])

const { t } = useI18n()
const posture = ref('balanced')
const saving = ref(false)

watch(
  () => props.dossier?.operationPosture,
  (v) => {
    if (v) posture.value = v
  },
  { immediate: true }
)

const canEdit = computed(() => props.dossier && !props.dossier.tacticsLocked)

async function savePosture() {
  if (!canEdit.value || posture.value === props.dossier?.operationPosture) return
  saving.value = true
  try {
    emit('update-posture', posture.value)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section
    v-if="dossier?.nextMatch"
    class="mt-10 border border-line bg-bg-soft p-6"
    data-testid="operation-dossier"
  >
    <p class="section-label">{{ t('dossier.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('dossier.lead') }}</p>

    <div class="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
      <p class="text-ink">
        {{ t('dossier.opponent') }}:
        <span class="font-medium">{{ dossier.nextMatch.opponentName }}</span>
        <span v-if="dossier.nextMatch.opponentIsBot" class="text-ink-faint"> (bot)</span>
      </p>
      <p class="text-ink-muted">{{ t('dossier.cycle', { cycle: dossier.seasonCycle }) }}</p>
    </div>

    <div v-if="dossier.environment?.line" class="mt-4 text-xs text-ink-muted">
      {{ dossier.environment.line }}
      <span v-if="!dossier.environment.confirmed" class="text-ink-faint"> — {{ t('dossier.envFuzzy') }}</span>
    </div>

    <div class="mt-8 grid gap-8 lg:grid-cols-2">
      <div>
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('dossier.ownSquad') }}</p>
        <p class="mt-2 text-sm text-ink">{{ dossier.ownSquad.ordersLabel }}</p>
        <p class="mt-1 text-xs text-ink-muted">
          {{ t('dossier.teamSpeed', { speed: dossier.ownSquad.teamSpeed }) }}
          · {{ t('dossier.cardsEquipped', { count: dossier.ownSquad.cardsEquipped }) }}
        </p>
        <ul class="mt-4 space-y-2 text-xs text-ink-muted">
          <li v-for="member in dossier.ownSquad.members" :key="member.name">
            <span class="text-ink">{{ member.name }}</span>
            · {{ member.battleStrategy }}
            · {{ member.artLabel }}
            <template v-if="member.tacticCard">
              · {{ t('dossier.cardEquipped') }}
            </template>
          </li>
        </ul>
      </div>

      <div>
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('dossier.scoutTitle') }}</p>
        <p v-if="!dossier.scoutAvailable" class="mt-2 text-xs text-ink-faint">
          {{ t('dossier.scoutLocked') }}
        </p>
        <template v-else-if="dossier.scout">
          <ul class="mt-3 space-y-2 text-xs leading-relaxed text-ink-muted">
            <li v-for="(line, i) in dossier.scout.lines" :key="`scout-${i}`">{{ line }}</li>
          </ul>
          <ul v-if="dossier.scout.profiles?.length" class="mt-4 space-y-1 border-t border-line/50 pt-3 text-xs text-ink-faint">
            <li v-for="(profile, i) in dossier.scout.profiles" :key="`prof-${i}`">
              {{ profile.artLabel }} · {{ t('dossier.potential', { level: profile.potentialHint }) }}
              <span v-if="profile.element"> · {{ profile.element }}</span>
            </li>
          </ul>
        </template>
      </div>
    </div>

    <div class="mt-8">
      <label class="text-xs text-ink-muted">
        {{ t('dossier.postureLabel') }}
        <select
          v-model="posture"
          class="mt-2 block w-full max-w-xs border border-line bg-bg px-3 py-2 text-sm text-ink disabled:opacity-50"
          :disabled="!canEdit || saving"
          data-testid="dossier-posture-select"
          @change="savePosture"
        >
          <option v-for="opt in dossier.postureOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>
      <p v-if="dossier.tacticsLocked" class="mt-2 text-xs text-fire">{{ t('dossier.locked') }}</p>
    </div>

    <div v-if="dossier.advice?.length" class="mt-8 border-t border-line/50 pt-6">
      <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('dossier.adviceTitle') }}</p>
      <ul class="mt-3 space-y-2 text-xs leading-relaxed text-ink">
        <li v-for="(tip, i) in dossier.advice" :key="`adv-${i}`">→ {{ tip }}</li>
      </ul>
    </div>
  </section>
</template>
