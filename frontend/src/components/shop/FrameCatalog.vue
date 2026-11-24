<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ProfileFrameOverlay from '../player/ProfileFrameOverlay.vue';
import NinjaPortrait from '../player/NinjaPortrait.vue';
import { useShopStore } from '../../stores/shop.js';
import { usePlayerStore } from '../../stores/player.js';

defineOptions({ name: 'FrameCatalog' });

const { t, locale, n } = useI18n();
const shop = useShopStore();
const player = usePlayerStore();
const busyId = ref(null);
const message = ref(null);
const error = ref(null);

const frames = computed(() => shop.frames || []);
const previewAvatarId = computed(() => player.character?.profile?.avatarId || null);
const previewName = computed(() => player.character?.name || 'N');

onMounted(() => {
  if (!player.character) {
    void player.fetchPlayer().catch(() => {});
  }
});

function frameName(frame) {
  return locale.value === 'en' ? frame.nameEn : frame.nameFr;
}

function frameDesc(frame) {
  return locale.value === 'en' ? frame.descriptionEn : frame.descriptionFr;
}

async function buy(frame) {
  if (!frame || frame.owned || busyId.value) return;
  busyId.value = frame.id;
  message.value = null;
  error.value = null;
  const result = await shop.purchaseFrame(frame.id);
  busyId.value = null;
  if (!result) {
    error.value = shop.error || t('shop.cosmetics.buyFailed');
    return;
  }
  message.value = t('shop.cosmetics.buyOk');
  try {
    await player.fetchPlayer();
  } catch {
    /* optional */
  }
}
</script>

<template>
  <section class="frame-catalog" data-testid="shop-frames">
    <header class="section-head">
      <h2 class="section-head__title">{{ t('shop.cosmetics.title') }}</h2>
      <span class="section-head__rule" aria-hidden="true" />
    </header>
    <p class="mt-2 text-ink-muted">{{ t('shop.cosmetics.lead') }}</p>
    <p v-if="message" class="alert alert--success" role="status">{{ message }}</p>
    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>

    <ul class="frame-catalog__list">
      <li v-for="frame in frames" :key="frame.id" class="frame-catalog__item panel">
        <div class="frame-catalog__preview">
          <NinjaPortrait :avatar-id="previewAvatarId" :name="previewName" />
          <ProfileFrameOverlay :frame-id="frame.id" variant="avatar" />
        </div>
        <div class="frame-catalog__body">
          <strong>{{ frameName(frame) }}</strong>
          <p class="text-ink-muted">{{ frameDesc(frame) }}</p>
          <p v-if="frame.owned" class="frame-catalog__owned">{{ t('shop.cosmetics.owned') }}</p>
          <button
            v-else
            type="button"
            class="btn-primary btn-sm"
            :disabled="Boolean(busyId) || (shop.balances?.ryos || 0) < frame.ryos"
            @click="buy(frame)"
          >
            {{
              busyId === frame.id
                ? t('shop.cosmetics.buying')
                : t('shop.cosmetics.buy', { n: n(frame.ryos) })
            }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.frame-catalog {
  display: grid;
  gap: 0.85rem;
}

.frame-catalog__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
}

.frame-catalog__item {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  text-align: center;
  padding: 1rem;
}

.frame-catalog__preview {
  position: relative;
  width: 5.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
}

.frame-catalog__preview :deep(.ninja-portrait) {
  border-radius: 50%;
}

.frame-catalog__body {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
}

.frame-catalog__owned {
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}
</style>
