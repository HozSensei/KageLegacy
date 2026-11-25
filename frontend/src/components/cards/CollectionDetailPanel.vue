<script setup>
import { RouterLink } from 'vue-router';
import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'CollectionDetailPanel' });

const props = defineProps({
  /** 'hole' | 'card' | 'empty' */
  mode: {
    type: String,
    required: true,
    validator: v => ['hole', 'card', 'empty'].includes(v),
  },
  kicker: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
  shape: { type: String, default: 'lozenge' },
  name: { type: String, default: '' },
  catalogueLabel: { type: String, default: '' },
  description: { type: String, default: '' },
  missingDetail: { type: String, default: '' },
  missingHint: { type: String, default: '' },
  shopLabel: { type: String, default: '' },
  passiveBonus: { type: Object, default: null },
  passiveBonusLabel: { type: String, default: '' },
  statLabel: { type: Function, default: key => key },
  quantityLabel: { type: String, default: '' },
  quantity: { type: Number, default: null },
  upgradeLevelLabel: { type: String, default: '' },
  upgradeLevel: { type: Number, default: 0 },
  upgradeLabel: { type: String, default: '' },
  upgradeCost: { type: Object, default: null },
  canUpgrade: { type: Boolean, default: false },
  upgradeUnavailableReason: { type: String, default: null },
  disenchantLabel: { type: String, default: '' },
  disenchantGain: { type: Object, default: null },
  actionsBusy: { type: Boolean, default: false },
  feedback: { type: Object, default: null },
  feedbackText: { type: String, default: '' },
  emptyHint: { type: String, default: '' },
  closeLabel: { type: String, required: true },
  locale: { type: String, default: 'fr' },
  resourceLabel: { type: Function, default: () => '' },
});

const emit = defineEmits(['close', 'upgrade', 'disenchant']);

function formatAmount(value) {
  return Number(value).toLocaleString(props.locale);
}
</script>

<template>
  <aside class="collection-detail" data-testid="collection-detail" :data-tone="tone">
    <div class="collection-detail__head">
      <p class="collection-detail__kicker">
        <span class="shape" :class="`shape--${shape}`" aria-hidden="true" />
        {{ kicker }}
      </p>
      <button
        type="button"
        class="btn-icon collection-detail__close"
        data-testid="collection-detail-close"
        :aria-label="closeLabel"
        @click="emit('close')"
      >
        <AppIcon name="close" size="1.125rem" :stroke-width="2" />
      </button>
    </div>
    <h2 class="sr-only">{{ kicker }}</h2>

    <Transition name="rise" mode="out-in">
      <div v-if="mode === 'hole'" key="hole" class="collection-detail__body">
        <p class="collection-detail__name">{{ name }}</p>
        <p class="collection-detail__missing">{{ missingDetail }}</p>
        <p class="mt-3 leading-relaxed text-ink-muted">{{ missingHint }}</p>
        <p class="mt-6">
          <RouterLink to="/shop" class="btn-primary btn-block">{{ shopLabel }}</RouterLink>
        </p>
        <p
          v-if="feedback"
          class="alert mt-4"
          :class="`alert--${feedback.type}`"
          role="status"
          :data-testid="`collection-${feedback.action}-feedback`"
        >
          {{ feedbackText }}
        </p>
      </div>

      <div v-else-if="mode === 'card'" key="card" class="collection-detail__body">
        <p class="collection-detail__name">{{ name }}</p>
        <p v-if="catalogueLabel" class="collection-detail__catalogue-n">{{ catalogueLabel }}</p>
        <p class="mt-3 leading-relaxed text-ink">{{ description }}</p>

        <div v-if="passiveBonus" class="collection-detail__passive">
          <p class="t-kicker">{{ passiveBonusLabel }}</p>
          <ul class="collection-detail__passive-list">
            <li v-for="(value, key) in passiveBonus" :key="key">
              <span class="figure figure--sm">+{{ value }}</span>
              {{ statLabel(key) }}
            </li>
          </ul>
        </div>

        <template v-if="quantity != null">
          <dl class="collection-detail__figures">
            <div>
              <dt class="t-kicker">{{ quantityLabel }}</dt>
              <dd class="figure figure--md">×{{ quantity }}</dd>
            </div>
            <div>
              <dt class="t-small">{{ upgradeLevelLabel }}</dt>
              <dd class="collection-detail__levels" aria-hidden="true">
                <span
                  v-for="n in 2"
                  :key="n"
                  class="lozenge"
                  :class="{ 'lozenge--hollow': n > upgradeLevel }"
                />
              </dd>
            </div>
          </dl>

          <div class="mt-6 flex flex-col gap-2">
            <button
              type="button"
              class="btn-primary btn-block"
              data-testid="collection-upgrade"
              :disabled="actionsBusy || !canUpgrade"
              @click="emit('upgrade')"
            >
              <span>{{ upgradeLabel }}</span>
              <span v-if="upgradeCost" class="collection-detail__action-cost">
                <span v-if="upgradeCost.ryos" :title="resourceLabel('ryos', upgradeCost.ryos)">
                  <AppIcon name="ryos" size="0.9rem" />
                  <span class="sr-only">{{ resourceLabel('ryos', upgradeCost.ryos) }}</span>
                  <span aria-hidden="true">{{ formatAmount(upgradeCost.ryos) }}</span>
                </span>
                <span v-if="upgradeCost.dust" :title="resourceLabel('dust', upgradeCost.dust)">
                  <AppIcon name="dust" size="0.9rem" />
                  <span class="sr-only">{{ resourceLabel('dust', upgradeCost.dust) }}</span>
                  <span aria-hidden="true">{{ formatAmount(upgradeCost.dust) }}</span>
                </span>
                <span
                  v-if="upgradeCost.essence"
                  :title="resourceLabel('essence', upgradeCost.essence)"
                >
                  <AppIcon name="essence" size="0.9rem" />
                  <span class="sr-only">{{ resourceLabel('essence', upgradeCost.essence) }}</span>
                  <span aria-hidden="true">{{ formatAmount(upgradeCost.essence) }}</span>
                </span>
              </span>
            </button>
            <p
              v-if="feedback?.action === 'upgrade'"
              class="alert"
              :class="`alert--${feedback.type}`"
              role="status"
              data-testid="collection-upgrade-feedback"
            >
              {{ feedbackText }}
            </p>
            <p v-if="upgradeUnavailableReason" class="collection-detail__action-hint">
              {{ upgradeUnavailableReason }}
            </p>
            <button
              type="button"
              class="btn-ghost btn-block"
              data-testid="collection-disenchant"
              :disabled="actionsBusy"
              @click="emit('disenchant')"
            >
              <span>{{ disenchantLabel }}</span>
              <span class="collection-detail__action-cost" data-gain="true">
                <span
                  v-if="disenchantGain?.dust"
                  :title="resourceLabel('dust', disenchantGain.dust)"
                >
                  <AppIcon name="dust" size="0.9rem" />
                  <span class="sr-only">{{ resourceLabel('dust', disenchantGain.dust) }}</span>
                  <span aria-hidden="true">+{{ formatAmount(disenchantGain.dust) }}</span>
                </span>
                <span
                  v-if="disenchantGain?.essence"
                  :title="resourceLabel('essence', disenchantGain.essence)"
                >
                  <AppIcon name="essence" size="0.9rem" />
                  <span class="sr-only">{{
                    resourceLabel('essence', disenchantGain.essence)
                  }}</span>
                  <span aria-hidden="true">+{{ formatAmount(disenchantGain.essence) }}</span>
                </span>
              </span>
            </button>
            <p
              v-if="feedback?.action === 'disenchant'"
              class="alert"
              :class="`alert--${feedback.type}`"
              role="status"
              data-testid="collection-disenchant-feedback"
            >
              {{ feedbackText }}
            </p>
          </div>
        </template>
      </div>

      <div v-else key="empty" class="collection-detail__body">
        <p class="mt-2 text-ink-muted">{{ emptyHint }}</p>
        <p
          v-if="feedback"
          class="alert mt-4"
          :class="`alert--${feedback.type}`"
          role="status"
          :data-testid="`collection-${feedback.action}-feedback`"
        >
          {{ feedbackText }}
        </p>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.collection-detail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 1.25rem 1.25rem 1.5rem;
  border-top: 6px solid var(--tone-fill);
  background: var(--color-bg-card);
  transition: border-color var(--dur-base) ease;
}

.collection-detail__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.collection-detail__close {
  flex-shrink: 0;
  margin: -0.35rem -0.35rem 0 0;
}

.collection-detail__kicker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tone);
}

.collection-detail__name {
  margin-top: 0.85rem;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem);
  font-weight: 800;
  font-stretch: 80%;
  line-height: 0.98;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.collection-detail__missing {
  margin-top: 0.55rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.collection-detail__catalogue-n {
  margin-top: 0.35rem;
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 700;
  font-stretch: 85%;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-faint);
}

.collection-detail__passive {
  margin-top: 1.25rem;
  padding: 0.85rem 1rem;
  background: var(--color-bg-soft);
}

.collection-detail__passive-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
  font-weight: 500;
}

.collection-detail__passive-list .figure {
  display: inline-block;
  min-width: 2.25rem;
  color: var(--color-indigo);
}

.collection-detail__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.collection-detail__figures dd {
  margin-top: 0.5rem;
}

.collection-detail__action-hint {
  margin: -0.2rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.collection-detail__action-cost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.collection-detail__action-cost span {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.collection-detail__action-cost[data-gain='true'] {
  color: var(--color-leaf);
}

.collection-detail__levels {
  display: flex;
  gap: 0.45rem;
  padding-top: 0.35rem;
  font-size: 1.5rem;
  color: var(--color-vermilion);
}
</style>
