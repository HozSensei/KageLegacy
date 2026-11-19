<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import IntentDisplay from './IntentDisplay.vue';
import StatusIcon from './StatusIcon.vue';
import AppIcon from '../ui/AppIcon.vue';
import { useDeltaFeed } from '../../composables/useDeltaFeed';
import { localizedName } from '../../utils/localeContent.js';

defineOptions({ name: 'EnemyDisplay' });

const props = defineProps({
  enemy: { type: Object, required: true },
  intentTargets: { type: Array, default: null },
});

const { locale, t } = useI18n();

const name = computed(() => localizedName(props.enemy, locale.value));

const hpPct = computed(() => {
  const max = Math.max(1, props.enemy.maxHp || 1);
  return Math.max(0, Math.min(100, (100 * (props.enemy.hp || 0)) / max));
});

const initial = computed(() =>
  String(name.value || '?')
    .trim()
    .charAt(0)
    .toUpperCase()
);

const { deltas, hit } = useDeltaFeed(() => props.enemy.hp);

function targetLabel(intent) {
  if (!props.intentTargets || !intent) return '';
  return (
    intent.targetName ||
    props.intentTargets.find(
      target => target?.id != null && String(target.id) === String(intent.targetId)
    )?.name ||
    ''
  );
}
</script>

<template>
  <div
    class="fighter"
    :class="{ 'fighter--hit': hit }"
    data-tone="vermilion"
    data-testid="enemy-display"
  >
    <div class="fighter__head">
      <span class="fighter__avatar fighter__avatar--lozenge" aria-hidden="true">{{ initial }}</span>
      <div class="min-w-0 flex-1">
        <p class="fighter__role">
          {{ enemy.boss ? t('combat.bossLabel') : t('combat.enemyLabel') }}
        </p>
        <h2 class="fighter__name">{{ name }}</h2>
      </div>
    </div>

    <IntentDisplay :intent="enemy.intent" :target-label="targetLabel(enemy.intent)" />
    <IntentDisplay
      v-if="enemy.nextIntent?.type"
      :intent="enemy.nextIntent"
      :target-label="targetLabel(enemy.nextIntent)"
      preview
    />

    <div class="fighter__hp">
      <span
        v-for="entry in deltas"
        :key="entry.id"
        class="float-num"
        :class="entry.amount < 0 ? 'float-num--loss' : 'float-num--gain'"
        aria-hidden="true"
      >
        {{ entry.amount > 0 ? '+' : '−' }}{{ Math.abs(entry.amount) }}
      </span>
      <p class="fighter__hp-row">
        <span class="fighter__hp-value">{{ enemy.hp }}</span>
        <span class="fighter__hp-max">
          /{{ enemy.maxHp }}<span class="fighter__hp-unit">{{ t('combat.hpLabel') }}</span>
        </span>
      </p>
      <div class="fighter__bar">
        <span class="fighter__bar-fill" :style="{ width: `${hpPct}%` }" />
      </div>
    </div>

    <div v-if="enemy.block || enemy.statuses?.length" class="fighter__row">
      <span
        v-if="enemy.block"
        :key="enemy.block"
        class="armor-chip"
        :title="t('combat.block', { n: enemy.block })"
      >
        <AppIcon name="block" size="1rem" :stroke-width="2" />
        <span class="armor-chip__value">{{ enemy.block }}</span>
        {{ t('combat.blockLabel') }}
      </span>
      <div v-if="enemy.statuses?.length" class="fighter__statuses">
        <StatusIcon v-for="(s, idx) in enemy.statuses" :key="`${s.key}-${idx}`" :status="s" />
      </div>
    </div>
  </div>
</template>
