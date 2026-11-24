<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import NinjaProfileCard from '../player/NinjaProfileCard.vue';
import { useShopStore } from '../../stores/shop.js';
import { usePlayerStore } from '../../stores/player.js';
import {
  ninjaProfileStats,
  ninjaRankLabel,
  readNinjaAppearance,
} from '../../utils/ninjaProfile.js';

defineOptions({ name: 'CardEffectCatalog' });

const { t, te, locale, n } = useI18n();
const shop = useShopStore();
const player = usePlayerStore();
const busyId = ref(null);
const message = ref(null);
const error = ref(null);

const effects = computed(() => shop.cardEffects || []);
const character = computed(() => player.character);
const baseProfile = computed(() => readNinjaAppearance(character.value?.profile));
const cardStats = computed(() => ninjaProfileStats(character.value?.stats));
const rankLabel = computed(() =>
  character.value?.rank ? ninjaRankLabel(character.value.rank, t, te) : null
);

onMounted(() => {
  if (!player.character) {
    void player.fetchPlayer().catch(() => {});
  }
});

function previewProfile(effectId) {
  return {
    ...baseProfile.value,
    cardEffectId: effectId,
  };
}

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
        <div class="fx-catalog__preview" aria-hidden="true">
          <div class="fx-catalog__card-scale">
            <NinjaProfileCard
              :name="character?.name || 'Ninja'"
              :rank="rankLabel"
              :level="character?.level ?? 1"
              :profile="previewProfile(entry.id)"
              :faction-id="character?.factionId"
              :faction-accent="character?.faction?.accentColor"
              :stats="cardStats"
              :arts="character?.stats?.total"
            />
          </div>
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
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
}

.fx-catalog__item {
  display: grid;
  gap: 0.85rem;
  justify-items: stretch;
  text-align: center;
  padding: 1rem;
}

.fx-catalog__preview {
  position: relative;
  width: 100%;
  /* Emprise visuelle ≈ carte à 58 % */
  height: 13.5rem;
  overflow: hidden;
  display: grid;
  place-items: start center;
  pointer-events: none;
}

.fx-catalog__card-scale {
  width: 22rem;
  max-width: none;
  transform: scale(0.58);
  transform-origin: top center;
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

@media (max-width: 420px) {
  .fx-catalog__preview {
    height: 12rem;
  }

  .fx-catalog__card-scale {
    transform: scale(0.5);
  }
}
</style>
