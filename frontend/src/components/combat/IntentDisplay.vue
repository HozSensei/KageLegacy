<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'IntentDisplay' });

const props = defineProps({
  intent: { type: Object, default: null },
  preview: { type: Boolean, default: false },
  targetLabel: { type: String, default: '' },
});

const { t } = useI18n();

const kind = computed(() => props.intent?.type || 'unknown');

const text = computed(() => {
  const i = props.intent;
  if (!i) return t('combat.intent.unknown');
  if (i.type === 'attack') {
    if (props.preview) return t('combat.intent.attackType');
    const dmg = i.displayDamage ?? i.damage ?? '?';
    return t('combat.intent.attack', { n: dmg });
  }
  if (i.type === 'defend') {
    if (props.preview) return t('combat.intent.defendType');
    return t('combat.intent.defend', { n: i.block ?? '?' });
  }
  if (i.type === 'buff') return t('combat.intent.buff');
  if (i.type === 'debuff') return t('combat.intent.debuff');
  if (i.type === 'sealed' || i.type === 'skip') return t('combat.intent.sealed');
  return t('combat.intent.special');
});

const glyph = computed(() => {
  if (kind.value === 'sealed' || kind.value === 'skip') return 'debuff';
  const known = ['attack', 'defend', 'buff', 'debuff', 'special'];
  if (known.includes(kind.value)) return kind.value;
  return props.intent ? 'special' : 'unknown';
});

/** Valeur chiffrée mise en avant (dégâts ou armure annoncés). */
const amount = computed(() => {
  const i = props.intent;
  if (props.preview || !i) return null;
  if (i.type === 'attack') return i.displayDamage ?? i.damage ?? null;
  if (i.type === 'defend') return i.block ?? null;
  return null;
});

const tone = computed(() => {
  if (kind.value === 'attack') return 'vermilion';
  if (kind.value === 'defend') return 'indigo';
  if (kind.value === 'buff') return 'gold';
  return 'ink';
});
</script>

<template>
  <div
    class="intent"
    :class="`intent--${kind}`"
    :data-tone="tone"
    :data-testid="preview ? 'enemy-next-intent' : 'enemy-intent'"
  >
    <span class="intent__glyph" aria-hidden="true">
      <AppIcon :name="glyph" size="1.125rem" :stroke-width="2" />
    </span>
    <span class="intent__body">
      <span class="intent__label">{{
        t(preview ? 'combat.nextIntentLabel' : 'combat.intentLabel')
      }}</span>
      <span class="intent__text">{{ text }}</span>
      <span v-if="targetLabel" class="intent__text">{{
        t('coop.intentTarget', { name: targetLabel })
      }}</span>
    </span>
    <span v-if="amount != null" :key="amount" class="intent__amount" aria-hidden="true">{{
      amount
    }}</span>
  </div>
</template>

<style scoped>
.intent {
  display: inline-flex;
  align-items: stretch;
  max-width: 100%;
  background: var(--color-bg-card);
  color: var(--color-ink);
}

.intent__glyph {
  display: grid;
  place-items: center;
  width: 2.5rem;
  flex: none;
  background: var(--tone-fill);
  color: var(--tone-on);
}

.intent__glyph > * {
  animation: nudge 2.4s ease-in-out infinite;
}

.intent__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 0.35rem 0.7rem;
}

.intent__label {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.intent__text {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25;
}

.intent__amount {
  display: grid;
  place-items: center;
  min-width: 2.75rem;
  padding: 0 0.5rem;
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--tone);
  animation: pop-in 320ms var(--ease-out-quint) both;
}
</style>
