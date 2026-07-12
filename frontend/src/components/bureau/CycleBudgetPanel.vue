<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useFormatRyos } from '../../composables/useFormatRyos'

const { t } = useI18n()
const { formatRyos } = useFormatRyos()
const store = useSquadStore()

const budget = computed(() => store.cycleBudget)
</script>

<template>
  <div v-if="budget" class="mt-10 border-t border-line pt-8" data-testid="bureau-budget-panel">
    <p class="section-label">{{ t('bureau.budgetTitle') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('bureau.budgetHint') }}</p>

    <dl class="mt-4 space-y-2 text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-ink-muted">{{ t('bureau.budgetCurrent') }}</dt>
        <dd class="text-ink">{{ formatRyos(budget.ryos) }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-ink-muted">{{ t('bureau.budgetSalaries') }}</dt>
        <dd class="text-fire">−{{ formatRyos(budget.salariesTotal) }}</dd>
      </div>
      <template v-if="budget.trainingLines?.length">
        <div
          v-for="line in budget.trainingLines"
          :key="line.ninjaId"
          class="flex justify-between gap-4 text-xs"
        >
          <dt class="text-ink-faint pl-2">
            {{ line.ninjaName }} — {{ t(`training.types.${line.trainingType ?? line.focus}`) }}
          </dt>
          <dd class="text-fire">−{{ formatRyos(line.amount) }}</dd>
        </div>
      </template>
      <div v-if="budget.interestProjected > 0" class="flex justify-between gap-4 text-xs">
        <dt class="text-ink-faint">{{ t('bureau.budgetInterest') }}</dt>
        <dd class="text-fire">−{{ formatRyos(budget.interestProjected) }}</dd>
      </div>
      <div class="flex justify-between gap-4 border-t border-line pt-2 font-medium">
        <dt class="text-ink">{{ t('bureau.budgetProjected') }}</dt>
        <dd :class="budget.projectedBalance < 0 ? 'text-fire' : 'text-accent'">
          {{ formatRyos(budget.projectedBalance) }}
        </dd>
      </div>
    </dl>

    <p
      v-if="budget.projectedBalance < budget.overdraftLimit"
      class="mt-3 text-xs text-fire"
    >
      {{ t('bureau.budgetOverdraftWarning', { limit: budget.overdraftLimit.toLocaleString() }) }}
    </p>
    <p v-else-if="store.sensei?.salaryDebt" class="mt-3 text-xs text-fire">
      {{ t('bureau.budgetDebtHint') }}
    </p>
  </div>
</template>
