<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ProfileCardAura from '../player/ProfileCardAura.vue';
import { useShopStore } from '../../stores/shop.js';
import { usePlayerStore } from '../../stores/player.js';

defineOptions({ name: 'CardEffectCatalog' });

const { t, locale, n } = useI18n();
const shop = useShopStore();
const player = usePlayerStore();
const busyId = ref(null);
const message = ref(null);
const error = ref(null);

const effects = computed(() => shop.cardEffects || []);

onMounted(() => {
  if (!player.character) {
    void player.fetchPlayer().catch(() => {});
  }
});

function effectName(entry) {
  return locale.value === 'en' ? entry.nameEn : entry.nameFr;
}

function effectDesc(entry) {
  return locale.value === 'en' ? entry.descriptionEn : entry.descriptionFr;
}

async function buy(entry) {
  if (!entry || entry.owned || busyId.value) return;
  busyId.value = entry.id;
  message.value = null;
  error.value = null;
  const result = await shop.purchaseCardEffect(entry.id);
  busyId.value = null;
  if (!result) {
    error.value = shop.error || t('shop.cardEffects.buyFailed');
    return;
  }
  message.value = t('shop.cardEffects.buyOk');
  try {
    await player.fetchPlayer();
  } catch {
    /* optional */
  }
}
</script>

<template>
  <section class="fx-catalog" data-testid="shop-card-effects">
    <header class="section-head">
      <h2 class="section-head__title">{{ t('shop.cardEffects.title') }}</h2>
      <span class="section-head__rule" aria-hidden="true" />
    </header>
    <p class="mt-2 text-ink-muted">{{ t('shop.cardEffects.lead') }}</p>
    <p v-if="message" class="alert alert--success" role="status">{{ message }}</p>
    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>

    <ul class="fx-catalog__list">
      <li v-for="entry in effects" :key="entry.id" class="fx-catalog__item panel">
        <div class="fx-catalog__preview">
          <span class="fx-catalog__card-face" />
          <ProfileCardAura :card-effect-id="entry.id" />
        </div>
        <div class="fx-catalog__body">
          <strong>{{ effectName(entry) }}</strong>
          <p class="text-ink-muted">{{ effectDesc(entry) }}</p>
          <p v-if="entry.owned" class="fx-catalog__owned">{{ t('shop.cardEffects.owned') }}</p>
          <button
            v-else
            type="button"
            class="btn-primary btn-sm"
            :disabled="Boolean(busyId) || (shop.balances?.ryos || 0) < entry.ryos"
            @click="buy(entry)"
          >
            {{
              busyId === entry.id
                ? t('shop.cardEffects.buying')
                : t('shop.cardEffects.buy', { n: n(entry.ryos) })
            }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.fx-catalog {
  display: grid;
  gap: 0.85rem;
}

.fx-catalog__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
}

.fx-catalog__item {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  text-align: center;
  padding: 1rem;
}

.fx-catalog__preview {
  position: relative;
  width: 100%;
  max-width: 11rem;
  aspect-ratio: 3 / 4;
  border-radius: 0.65rem;
  overflow: hidden;
}

.fx-catalog__card-face {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(160deg, rgb(30 40 55 / 0.85), rgb(12 16 28 / 0.95)),
    radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.12), transparent 55%);
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  border-radius: inherit;
}

.fx-catalog__body {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
}

.fx-catalog__owned {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}
</style>
