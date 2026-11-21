<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue';
import SiteFooter from '../components/layout/SiteFooter.vue';
import NinjaPortrait from '../components/player/NinjaPortrait.vue';
import LandingCardCarousel from '../components/landing/LandingCardCarousel.vue';
import gateImage from '../assets/illustrations/village-gate.webp';
import forestImage from '../assets/illustrations/forest-path.webp';
import bridgeImage from '../assets/illustrations/stone-bridge.webp';
import officeImage from '../assets/illustrations/hub-office.webp';
import marketImage from '../assets/illustrations/market-square.webp';
import cardAssaut from '../assets/cards/assaut-de-l-aube.webp';
import cardColonne from '../assets/cards/colonne-de-feu.webp';
import cardDome from '../assets/cards/dome-d-eau.webp';
import cardFaucon from '../assets/cards/faucon-de-foudre.webp';
import cardCitadelle from '../assets/cards/citadelle-de-pierre.webp';

defineOptions({ name: 'LandingView' });

const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const openFeature = ref('deck');
const features = ['deck', 'talents', 'missions'];

const mosaic = [
  { key: 'forge', image: cardAssaut, tall: true },
  { key: 'paths', image: cardColonne, tall: false },
  { key: 'clans', image: cardDome, tall: false },
  { key: 'boosters', image: cardFaucon, tall: false },
  { key: 'pass', image: cardCitadelle, tall: false },
];

const portraits = ['aspirant-1-1', 'aspirant-1-5', 'aspirant-1-9', 'aspirant-2-3'];

async function playAsGuest() {
  const ok = await auth.loginAsGuest({
    language: locale.value === 'en' ? 'en' : 'fr',
  });
  if (ok) router.push('/home');
}

function toggleFeature(key) {
  openFeature.value = openFeature.value === key ? null : key;
}
</script>

<template>
  <div class="landing" data-testid="landing-page">
    <!-- 1. Hero + carrousel déporté -->
    <section class="landing__hero" data-testid="landing-hero">
      <div class="landing__hero-media" aria-hidden="true">
        <img class="landing__hero-image" :src="gateImage" alt="" decoding="async" />
      </div>
      <div class="landing__hero-veil" aria-hidden="true" />

      <header class="landing__bar">
        <p class="landing__brand">
          <BrandMark size="1.5rem" />
          <span>{{ t('app.name') }}</span>
        </p>
        <nav class="landing__nav">
          <LocaleSwitcher data-testid="landing-locale-switcher" />
          <router-link to="/rules" class="landing__nav-link" data-testid="landing-rules-link">
            {{ t('rules.link') }}
          </router-link>
          <router-link to="/login" class="landing__nav-link">{{ t('auth.login') }}</router-link>
          <router-link to="/register" class="btn-secondary btn-sm landing__nav-register">
            {{ t('auth.register') }}
          </router-link>
          <ThemeToggle />
        </nav>
      </header>

      <div class="landing__hero-main">
        <div class="landing__hero-copy">
          <h1 class="t-display landing__title anim-rise">{{ t('landing.title') }}</h1>
          <p class="landing__lead anim-rise" style="--delay: 100ms">{{ t('landing.lead') }}</p>
          <div class="landing__actions anim-rise" style="--delay: 180ms">
            <button
              type="button"
              class="btn-primary btn-lg"
              data-testid="landing-guest"
              :disabled="auth.loading"
              @click="playAsGuest"
            >
              {{ auth.loading ? t('auth.loading') : t('landing.playGuest') }}
            </button>
            <router-link to="/register" class="btn-ghost btn-lg landing__ghost">
              {{ t('landing.createAccount') }}
            </router-link>
          </div>
          <p class="landing__hint">{{ t('landing.guestHint') }}</p>
          <p v-if="auth.error" class="alert alert--error mt-4">{{ auth.error }}</p>
        </div>
      </div>

      <LandingCardCarousel class="landing__hero-carousel" />
    </section>

    <!-- 2. Bandeau immersif centré -->
    <section class="landing__banner">
      <div class="landing__banner-media" aria-hidden="true">
        <img :src="bridgeImage" alt="" loading="lazy" decoding="async" />
      </div>
      <div class="landing__banner-veil" aria-hidden="true" />
      <div class="landing__banner-copy">
        <p class="landing__eyebrow">{{ t('landing.banner.eyebrow') }}</p>
        <h2 class="t-display landing__banner-title">{{ t('landing.banner.title') }}</h2>
        <p class="landing__banner-lead">{{ t('landing.banner.lead') }}</p>
        <router-link to="/rules" class="btn-primary">{{ t('landing.banner.cta') }}</router-link>
      </div>
    </section>

    <!-- 3. Accueil split : accordion + image -->
    <section class="landing__welcome">
      <div class="landing__welcome-copy">
        <h2 class="page-title">{{ t('landing.welcome.title') }}</h2>
        <p class="landing__section-lead">{{ t('landing.welcome.lead') }}</p>
        <ul class="landing__accordion">
          <li v-for="key in features" :key="key" class="landing__acc-item">
            <button
              type="button"
              class="landing__acc-trigger"
              :aria-expanded="openFeature === key"
              @click="toggleFeature(key)"
            >
              <span>{{ t(`landing.welcome.features.${key}.title`) }}</span>
              <span class="landing__acc-mark" aria-hidden="true">{{
                openFeature === key ? '−' : '+'
              }}</span>
            </button>
            <p v-if="openFeature === key" class="landing__acc-body">
              {{ t(`landing.welcome.features.${key}.body`) }}
            </p>
          </li>
        </ul>
      </div>
      <figure class="landing__welcome-frame">
        <img :src="forestImage" alt="" loading="lazy" decoding="async" />
        <ul class="landing__mini-portraits" aria-hidden="true">
          <li v-for="id in portraits" :key="id">
            <NinjaPortrait :avatar-id="id" />
          </li>
        </ul>
      </figure>
    </section>

    <!-- 4. Grille asymétrique « mises à jour / piliers » -->
    <section class="landing__mosaic">
      <div class="landing__mosaic-head">
        <h2 class="page-title">{{ t('landing.mosaic.title') }}</h2>
        <router-link to="/register" class="btn-secondary btn-sm">
          {{ t('landing.mosaic.cta') }}
        </router-link>
      </div>
      <div class="landing__mosaic-grid">
        <article
          v-for="tile in mosaic"
          :key="tile.key"
          class="landing__tile"
          :class="{ 'landing__tile--tall': tile.tall }"
        >
          <img :src="tile.image" alt="" loading="lazy" decoding="async" />
          <div class="landing__tile-copy">
            <p class="landing__tile-kicker">{{ t(`landing.mosaic.items.${tile.key}.kicker`) }}</p>
            <h3 class="t-heading">{{ t(`landing.mosaic.items.${tile.key}.title`) }}</h3>
          </div>
        </article>
      </div>
    </section>

    <!-- 5. Bandeau saison / village -->
    <section class="landing__season">
      <div class="landing__season-media" aria-hidden="true">
        <img :src="marketImage" alt="" loading="lazy" decoding="async" />
      </div>
      <div class="landing__season-veil" aria-hidden="true" />
      <div class="landing__season-copy">
        <p class="landing__eyebrow">{{ t('landing.season.eyebrow') }}</p>
        <h2 class="t-display landing__season-title">{{ t('landing.season.title') }}</h2>
        <p class="landing__season-lead">{{ t('landing.season.lead') }}</p>
        <button
          type="button"
          class="btn-primary"
          :disabled="auth.loading"
          @click="playAsGuest"
        >
          {{ t('landing.season.cta') }}
        </button>
      </div>
    </section>

    <!-- 6. CTA final -->
    <section class="landing__close">
      <div class="landing__close-media" aria-hidden="true">
        <img :src="officeImage" alt="" loading="lazy" decoding="async" />
      </div>
      <div class="landing__close-veil" aria-hidden="true" />
      <div class="landing__close-copy">
        <h2 class="t-display">{{ t('landing.closeTitle') }}</h2>
        <p>{{ t('landing.closeLead') }}</p>
        <div class="landing__actions">
          <button
            type="button"
            class="btn-primary btn-lg"
            :disabled="auth.loading"
            @click="playAsGuest"
          >
            {{ auth.loading ? t('auth.loading') : t('landing.playGuest') }}
          </button>
          <router-link to="/register" class="btn-ghost btn-lg landing__ghost">
            {{ t('landing.createAccount') }}
          </router-link>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<style scoped>
.landing {
  overflow-x: clip;
  background: var(--color-bg);
  color: var(--color-ink);
}

.landing__bar {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: min(76rem, 100%);
  margin-inline: auto;
  padding: 1rem var(--space-gutter);
}

.landing__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-gold-fill);
  font-size: 1.2rem;
}

.landing__nav {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.landing__nav-link,
.landing__footer-nav a {
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
}

.landing__nav-link {
  color: var(--color-on-fill);
}

.landing__nav-link:hover {
  color: var(--color-gold-fill);
}

.landing__nav-register {
  border-color: color-mix(in srgb, var(--color-on-fill) 40%, transparent);
  color: var(--color-on-fill);
  background: color-mix(in srgb, var(--color-on-fill) 10%, transparent);
}

.landing__ghost {
  color: var(--color-on-fill);
  border-color: color-mix(in srgb, var(--color-on-fill) 35%, transparent);
}

.landing__ghost:hover {
  background: color-mix(in srgb, var(--color-on-fill) 12%, transparent);
}

/* ——— 1. Hero ——— */

.landing__hero {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: min(100dvh, 52rem);
  padding-bottom: 4.5rem;
  overflow: visible;
  color: var(--color-on-fill);
}

.landing__hero-media,
.landing__hero-veil {
  position: absolute;
  inset: 0;
  border-radius: 0 0 1.25rem 1.25rem;
  overflow: hidden;
}

.landing__hero-media {
  z-index: 0;
}

.landing__hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 48% center;
  filter: var(--image-filter);
  transform: scale(1.05);
  animation: landing-ken 18s var(--ease-out-quint) both;
}

.landing__hero-veil {
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-indigo-deep) 55%, transparent),
      color-mix(in srgb, var(--color-indigo-deep) 18%, transparent) 45%,
      color-mix(in srgb, var(--color-indigo-deep) 88%, transparent)
    ),
    linear-gradient(
      100deg,
      color-mix(in srgb, var(--color-indigo-deep) 80%, transparent) 0%,
      transparent 62%
    );
}

.landing__hero-main {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  width: min(76rem, 100%);
  margin-inline: auto;
  padding: 2rem var(--space-gutter) 1rem;
}

.landing__hero-copy {
  width: min(34rem, 100%);
}

.landing__title {
  max-width: 12ch;
  color: var(--color-on-fill);
  text-wrap: balance;
}

.landing__lead,
.landing__hint {
  max-width: 32rem;
  line-height: 1.55;
}

.landing__lead {
  margin-top: 1rem;
  color: color-mix(in srgb, var(--color-on-fill) 82%, transparent);
}

.landing__hint {
  margin-top: 0.9rem;
  font-size: 0.8125rem;
  color: color-mix(in srgb, var(--color-on-fill) 66%, transparent);
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.35rem;
}

.landing__hero-carousel {
  position: relative;
  z-index: 4;
  width: min(36rem, calc(100% - 2 * var(--space-gutter)));
  margin: -2.5rem var(--space-gutter) 0 auto;
}

/* ——— Shared band helpers ——— */

.landing__eyebrow {
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-gold-fill);
}

.landing__section-lead {
  margin-top: 0.85rem;
  max-width: 36rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

/* ——— 2. Banner ——— */

.landing__banner,
.landing__season,
.landing__close {
  position: relative;
  display: grid;
  place-items: center;
  min-height: clamp(22rem, 48vw, 28rem);
  overflow: hidden;
  color: var(--color-on-fill);
  text-align: center;
}

.landing__banner-media,
.landing__season-media,
.landing__close-media,
.landing__banner-veil,
.landing__season-veil,
.landing__close-veil {
  position: absolute;
  inset: 0;
}

.landing__banner-media img,
.landing__season-media img,
.landing__close-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter);
}

.landing__banner-veil,
.landing__season-veil,
.landing__close-veil {
  background: color-mix(in srgb, var(--color-indigo-deep) 72%, transparent);
}

.landing__banner-copy,
.landing__season-copy,
.landing__close-copy {
  position: relative;
  z-index: 1;
  width: min(42rem, calc(100% - 2 * var(--space-gutter)));
  padding-block: 3rem;
}

.landing__banner-title,
.landing__season-title {
  margin-top: 0.65rem;
  color: var(--color-on-fill);
  text-wrap: balance;
}

.landing__banner-lead,
.landing__season-lead,
.landing__close-copy p {
  margin: 1rem auto 1.35rem;
  max-width: 34rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-on-fill) 80%, transparent);
}

/* ——— 3. Welcome split ——— */

.landing__welcome {
  display: grid;
  gap: 2rem;
  width: min(76rem, 100%);
  margin-inline: auto;
  padding: clamp(2.5rem, 6vw, 4.5rem) var(--space-gutter);
}

.landing__accordion {
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--color-line);
}

.landing__acc-item {
  border-bottom: 1px solid var(--color-line);
}

.landing__acc-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.landing__acc-mark {
  color: var(--color-vermilion);
  font-size: 1.35rem;
  line-height: 1;
}

.landing__acc-body {
  margin: 0 0 1rem;
  max-width: 34rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.landing__welcome-frame {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-vermilion) 55%, var(--color-line));
  min-height: 16rem;
}

.landing__welcome-frame > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter);
}

.landing__mini-portraits {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  display: flex;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing__mini-portraits li {
  width: 3.1rem;
  overflow: hidden;
  border: 1px solid var(--color-line-strong);
  background: var(--color-bg-card);
}

/* ——— 4. Mosaic ——— */

.landing__mosaic {
  width: min(76rem, 100%);
  margin-inline: auto;
  padding: 0 var(--space-gutter) clamp(2.5rem, 6vw, 4.5rem);
}

.landing__mosaic-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.landing__mosaic-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 1fr;
}

.landing__tile {
  position: relative;
  min-height: 10.5rem;
  overflow: hidden;
  background: var(--color-bg-soft);
}

.landing__tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.95);
}

.landing__tile-copy {
  position: absolute;
  inset: auto 0 0;
  padding: 1rem 1.1rem;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, #0b0d14 82%, transparent));
  color: var(--color-on-fill);
}

.landing__tile-kicker {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-gold-fill);
}

.landing__tile-copy .t-heading {
  margin-top: 0.25rem;
  color: var(--color-on-fill);
}

/* ——— 6. Close + footer ——— */

.landing__close {
  text-align: left;
}

.landing__close-copy {
  width: min(40rem, calc(100% - 2 * var(--space-gutter)));
  margin-right: auto;
  margin-left: var(--space-gutter);
  justify-self: start;
}

.landing__close-copy .t-display {
  color: var(--color-on-fill);
}

@keyframes landing-ken {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(1.02);
  }
}

@media (min-width: 768px) {
  .landing__mosaic-grid {
    grid-template-columns: 1.15fr 1fr 1fr;
    grid-template-rows: 12rem 12rem;
  }

  .landing__tile--tall {
    grid-row: span 2;
    min-height: 100%;
  }
}

@media (min-width: 960px) {
  .landing__hero-main {
    padding-bottom: 5.5rem;
  }

  .landing__hero-carousel {
    margin-top: -6.5rem;
    margin-bottom: -1.5rem;
  }

  .landing__welcome {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    align-items: center;
    gap: 3rem;
  }

  .landing__welcome-frame {
    min-height: 26rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__hero-image {
    animation: none;
    transform: none;
  }
}
</style>
