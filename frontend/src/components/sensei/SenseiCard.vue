<script setup>
import { useI18n } from 'vue-i18n'
import Badge from '../ui/Badge.vue'

defineProps({
  sensei: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const { t } = useI18n()
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-gray-800/50 shadow-sm ring-1 ring-white/10">
    <div class="px-4 py-5 sm:px-6" :class="compact ? 'py-4' : ''">
      <div class="flex items-center gap-3">
        <div class="flex size-12 items-center justify-center rounded-full bg-indigo-500/20 text-lg font-bold text-indigo-300 ring-2 ring-indigo-500/30">
          {{ sensei.name.charAt(0) }}
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ t('sensei.title') }}</p>
          <h2 class="text-lg font-bold text-white">{{ sensei.name }}</h2>
        </div>
      </div>

      <dl class="mt-5 grid grid-cols-1 gap-4" :class="compact ? '' : 'sm:grid-cols-2'">
        <div class="overflow-hidden rounded-lg bg-gray-900/50 px-3 py-3 ring-1 ring-white/5">
          <dt class="truncate text-xs font-medium text-gray-500">{{ t('sensei.specialty') }}</dt>
          <dd class="mt-1 flex items-center gap-2">
            <Badge color="purple">+15%</Badge>
            <span class="text-sm font-medium text-white">{{ sensei.specialty }}</span>
          </dd>
        </div>
        <div class="overflow-hidden rounded-lg bg-gray-900/50 px-3 py-3 ring-1 ring-white/5">
          <dt class="truncate text-xs font-medium text-gray-500">{{ t('sensei.ryos') }}</dt>
          <dd class="mt-1 text-lg font-semibold text-amber-400">{{ sensei.ryos.toLocaleString() }}</dd>
        </div>
        <div class="overflow-hidden rounded-lg bg-gray-900/50 px-3 py-3 ring-1 ring-white/5">
          <dt class="truncate text-xs font-medium text-gray-500">{{ t('sensei.reputation') }}</dt>
          <dd class="mt-1 text-lg font-semibold text-white">{{ sensei.reputation }}</dd>
        </div>
        <div class="overflow-hidden rounded-lg bg-gray-900/50 px-3 py-3 ring-1 ring-white/5">
          <dt class="truncate text-xs font-medium text-gray-500">{{ t('sensei.chakra') }}</dt>
          <dd class="mt-1">
            <div class="flex items-center justify-between text-sm">
              <span class="font-semibold text-cyan-400">{{ sensei.chakraPool }}</span>
              <span class="text-gray-500">/ 100</span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div class="h-full rounded-full bg-cyan-500" :style="{ width: `${sensei.chakraPool}%` }" />
            </div>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
