<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  sensei: { type: Object, required: true },
})

const emit = defineEmits(['change-language'])
const { t } = useI18n()
</script>

<template>
  <aside class="rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900 to-zinc-950 p-5 shadow-xl">
    <p class="mb-1 text-xs uppercase tracking-widest text-slate-500">{{ t('sensei.title') }}</p>
    <h2 class="mb-4 text-2xl font-bold text-slate-100">{{ sensei.name }}</h2>

    <dl class="space-y-3 text-sm">
      <div class="flex justify-between border-b border-slate-800 pb-2">
        <dt class="text-slate-400">{{ t('sensei.specialty') }}</dt>
        <dd class="font-medium text-violet-300">+15% {{ sensei.specialty }}</dd>
      </div>
      <div class="flex justify-between border-b border-slate-800 pb-2">
        <dt class="text-slate-400">{{ t('sensei.ryos') }}</dt>
        <dd class="font-mono text-amber-300">{{ sensei.ryos.toLocaleString() }}</dd>
      </div>
      <div class="flex justify-between border-b border-slate-800 pb-2">
        <dt class="text-slate-400">{{ t('sensei.reputation') }}</dt>
        <dd class="font-mono text-slate-200">{{ sensei.reputation }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-slate-400">{{ t('sensei.chakra') }}</dt>
        <dd class="font-mono text-cyan-300">{{ sensei.chakraPool }}/100</dd>
      </div>
    </dl>
  </aside>
</template>
