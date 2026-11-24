<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import PageHeader from '../components/ui/PageHeader.vue';
import BoosterOpening from '../components/shop/BoosterOpening.vue';
import forestImage from '../assets/illustrations/forest-path.webp';
import { useInventoryStore } from '../stores/inventory';
import { localizedDescription, localizedName } from '../utils/localeContent.js';

defineOptions({ name: 'InventoryView' });

const { t, locale } = useI18n();
const inventory = useInventoryStore();
const opening = ref(false);

onMounted(() => {
  inventory.fetchInventory();
});

const revealCards = computed(() => inventory.lastReveal?.cards || []);
const revealName = computed(() => {
  if (inventory.lastReveal?.kind === 'booster') {
    return t('notifications.rewardBooster', {
      kind: inventory.lastReveal.boosterType || 'standard',
    });
  }
  return t('shop.sealedScroll');
});

function itemName(entry) {
  return localizedName(entry, locale.value) || entry.itemKey;
}

function itemDesc(entry) {
  return localizedDescription(entry, locale.value) || '';
}

async function onMove(entry, from, to) {
  try {
    await inventory.moveItem(entry.itemKey, { from, to, quantity: 1 });
  } catch {
    /* store */
  }
}

async function onSetRyos(amount) {
  try {
    await inventory.setPouchRyos(amount);
  } catch {
    /* store */
  }
}

async function onReveal(entry) {
  try {
    if (entry.kind === 'booster') {
      await inventory.openBooster(entry.itemKey);
    } else if (entry.kind === 'pending_card') {
      await inventory.revealItem(entry.itemKey);
    } else {
      return;
    }
    opening.value = true;
  } catch {
    /* store */
  }
}

function onRevealDone() {
  opening.value = false;
  inventory.clearReveal();
}
</script>

<template>
  <div class="page-shell" data-testid="inventory-page">
    <PageHeader
      tone="leaf"
      :kicker="t('inventory.kicker')"
      :title="t('inventory.title')"
      :lead="t('inventory.lead')"
      :image="forestImage"
      image-position="50% 40%"
    >
      <template #actions>
        <RouterLink to="/missions" class="btn-ghost">
          {{ t('inventory.goMissions') }}
        </RouterLink>
      </template>
    </PageHeader>

    <p v-if="inventory.error" class="alert alert--error mt-4">{{ inventory.error }}</p>
    <p v-if="inventory.loading" class="mt-6 text-ink-muted">{{ t('inventory.loading') }}</p>

    <div class="inv-grid mt-8">
      <section class="inv-panel" data-testid="inventory-chest">
        <header class="inv-panel__head">
          <h2>{{ t('inventory.chestTitle') }}</h2>
          <p>{{ t('inventory.chestHint') }}</p>
        </header>
        <ul v-if="inventory.chest.length" class="inv-list">
          <li v-for="entry in inventory.chest" :key="`chest-${entry.id || entry.itemKey}`" class="inv-row">
            <div class="inv-row__meta">
              <strong>{{ itemName(entry) }}</strong>
              <span class="inv-row__qty">×{{ entry.quantity }}</span>
              <p v-if="itemDesc(entry)" class="inv-row__desc">{{ itemDesc(entry) }}</p>
            </div>
            <div class="inv-row__actions">
              <button
                v-if="entry.kind === 'pending_card' || entry.kind === 'booster'"
                type="button"
                class="btn-primary btn-sm"
                :disabled="inventory.actionLoading"
                @click="onReveal(entry)"
              >
                {{ entry.kind === 'booster' ? t('inventory.open') : t('inventory.reveal') }}
              </button>
              <button
                type="button"
                class="btn-secondary btn-sm"
                :disabled="inventory.actionLoading || inventory.pouchLocked"
                @click="onMove(entry, 'chest', 'pouch')"
              >
                {{ t('inventory.toPouch') }}
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="inv-empty">{{ t('inventory.chestEmpty') }}</p>
      </section>

      <section
        class="inv-panel"
        :class="{ 'inv-panel--locked': inventory.pouchLocked }"
        data-testid="inventory-pouch"
      >
        <header class="inv-panel__head">
          <h2>{{ t('inventory.pouchTitle') }}</h2>
          <p>{{ t('inventory.pouchHint') }}</p>
          <p
            v-if="inventory.pouchLocked"
            class="inv-panel__locked"
            data-testid="inventory-pouch-locked"
          >
            {{
              inventory.pouchLock?.kind === 'coop'
                ? t('inventory.pouchLockedCoop')
                : t('inventory.pouchLockedMission')
            }}
          </p>
        </header>

        <div class="inv-ryos" data-testid="inventory-pouch-ryos">
          <p class="inv-ryos__label">
            {{ t('inventory.pouchRyos', { n: inventory.pouchRyos }) }}
          </p>
          <div class="inv-ryos__options">
            <button
              v-for="stake in inventory.stakes"
              :key="stake"
              type="button"
              class="btn-ghost btn-sm"
              :class="{ 'inv-ryos__active': inventory.pouchRyos === stake }"
              :disabled="inventory.actionLoading || inventory.pouchLocked"
              @click="onSetRyos(stake)"
            >
              {{ t('inventory.pouchStakeOption', { n: stake }) }}
            </button>
          </div>
          <p class="inv-ryos__warn">{{ t('inventory.pouchLossWarning') }}</p>
        </div>

        <ul v-if="inventory.pouch.length" class="inv-list">
          <li v-for="entry in inventory.pouch" :key="`pouch-${entry.id || entry.itemKey}`" class="inv-row">
            <div class="inv-row__meta">
              <strong>{{ itemName(entry) }}</strong>
              <span class="inv-row__qty">×{{ entry.quantity }}</span>
            </div>
            <div class="inv-row__actions">
              <button
                type="button"
                class="btn-secondary btn-sm"
                :disabled="inventory.actionLoading || inventory.pouchLocked"
                @click="onMove(entry, 'pouch', 'chest')"
              >
                {{ t('inventory.toChest') }}
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="inv-empty">{{ t('inventory.pouchEmpty') }}</p>
      </section>
    </div>

    <Teleport to="body">
      <div
        v-if="opening && revealCards.length"
        class="loot-reveal"
        data-testid="inventory-reveal"
        role="dialog"
        aria-modal="true"
      >
        <div class="loot-reveal__scroll">
          <BoosterOpening
            :cards="revealCards"
            :active="opening"
            :booster-type="inventory.lastReveal?.boosterType || 'standard'"
            :booster-name="revealName"
            :card-count="revealCards.length"
            :show-collection-status="true"
            :done-label="t('inventory.revealDone')"
            @done="onRevealDone"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.inv-grid {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 900px) {
  .inv-grid {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
}

.inv-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 0;
  border-top: 1px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.inv-panel__head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
}

.inv-panel__head p {
  margin: 0.35rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.9375rem;
}

.inv-panel__locked {
  color: var(--color-vermilion) !important;
  font-weight: 600;
}

.inv-panel--locked {
  opacity: 0.92;
}

.inv-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inv-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.inv-row__meta {
  min-width: 0;
  flex: 1 1 12rem;
}

.inv-row__meta strong {
  font-size: 1rem;
}

.inv-row__qty {
  margin-left: 0.35rem;
  color: var(--color-ink-muted);
  font-weight: 600;
}

.inv-row__desc {
  margin: 0.25rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
}

.inv-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.inv-empty {
  margin: 0;
  color: var(--color-ink-muted);
}

.inv-ryos__label {
  margin: 0 0 0.5rem;
  font-weight: 700;
}

.inv-ryos__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.inv-ryos__active {
  outline: 2px solid var(--color-wood);
}

.inv-ryos__warn {
  margin: 0.65rem 0 0;
  color: var(--color-vermilion, #b33);
  font-size: 0.875rem;
  font-weight: 600;
}

.loot-reveal {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  padding:
    env(safe-area-inset-top, 0px)
    env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px)
    env(safe-area-inset-left, 0px);
}

.loot-reveal__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(0.75rem, 2.5vw, 1.5rem);
}
</style>
