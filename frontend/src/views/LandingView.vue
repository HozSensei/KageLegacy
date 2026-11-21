<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue';
import NinjaPortrait from '../components/player/NinjaPortrait.vue';
import gateImage from '../assets/illustrations/village-gate.webp';
import forestImage from '../assets/illustrations/forest-path.webp';
import bridgeImage from '../assets/illustrations/stone-bridge.webp';
import officeImage from '../assets/illustrations/hub-office.webp';
import cardAssaut from '../assets/cards/assaut-de-l-aube.webp';
import cardColonne from '../assets/cards/colonne-de-feu.webp';
import cardDome from '../assets/cards/dome-d-eau.webp';
import cardFaucon from '../assets/cards/faucon-de-foudre.webp';
import cardCitadelle from '../assets/cards/citadelle-de-pierre.webp';

defineOptions({ name: 'LandingView' });

const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const showcasePortraits = ['aspirant-1-1', 'aspirant-1-5', 'aspirant-1-9', 'aspirant-2-3', 'aspirant-2-12'];
const showcaseCards = [
  { src: cardAssaut, tone: 'vermilion' },
  { src: cardColonne, tone: 'gold' },
  { src: cardDome, tone: 'sky' },
  { src: cardFaucon, tone: 'leaf' },
  { src: cardCitadelle, tone: 'wood' },
];

const pillars = [
  { key: 'talents', tone: 'leaf', image: forestImage },
  { key: 'missions', tone: 'gold', image: officeImage },
  { key: 'season', tone: 'wood', image: bridgeImage },
];

const timeline = [
  'landing.timeline.create',
  'landing.timeline.build',
  'landing.timeline.grow',
  'landing.timeline.fight',
];

async function playAsGuest() {
  const ok = await auth.loginAsGuest({
    language: locale.value === 'en' ? 'en' : 'fr',
  });
  if (ok) router.push('/home');
}
</script>

<template>
  <div class="landing" data-testid="landing-page">
    <main>
      <!-- Hero full-bleed : marque + une promesse + CTA -->
      <section class="landing__hero" data-testid="landing-hero">
        <div class="landing__hero-media" aria-hidden="true">
          <img class="landing__hero-image" :src="gateImage" alt="" decoding="async" />
        </div>
        <div class="landing__hero-veil" aria-hidden="true" />

        <header class="landing__bar">
          <p class="landing__brand">
            <BrandMark size="1.625rem" />
            <span>{{ t('app.name') }}</span>
          </p>
          <nav class="landing__nav">
            <LocaleSwitcher data-testid="landing-locale-switcher" />
            <router-link to="/rules" class="landing__nav-link" data-testid="landing-rules-link">
              {{ t('rules.link') }}
            </router-link>
            <router-link to="/login" class="landing__nav-link">{{ t('auth.login') }}</router-link>
            <router-link to="/register" class="btn-secondary btn-sm landing__nav-register">{{
              t('auth.register')
            }}</router-link>
            <ThemeToggle />
          </nav>
        </header>

        <div class="landing__hero-copy">
          <p class="landing__brand-hero anim-rise">
            <BrandMark size="2.75rem" />
            <span>{{ t('app.name') }}</span>
          </p>
          <h1 class="t-display landing__title anim-rise" style="--delay: 80ms">
            {{ t('landing.title') }}
          </h1>
          <p class="landing__lead anim-rise" style="--delay: 160ms">{{ t('landing.lead') }}</p>
          <div class="landing__actions anim-rise" style="--delay: 240ms">
            <button
              type="button"
              class="btn-primary btn-lg"
              data-testid="landing-guest"
              :disabled="auth.loading"
              @click="playAsGuest"
            >
              {{ auth.loading ? t('auth.loading') : t('landing.playGuest') }}
            </button>
            <router-link to="/register" class="btn-ghost btn-lg landing__cta-ghost">
              {{ t('landing.createAccount') }}
            </router-link>
          </div>
          <p class="landing__hint anim-rise" style="--delay: 300ms">{{ t('landing.guestHint') }}</p>
          <p v-if="auth.error" class="alert alert--error mt-4">{{ auth.error }}</p>
        </div>
      </section>

      <!-- Portraits : forge ton shinobi -->
      <section class="landing__band landing__band--portraits">
        <div class="landing__band-inner">
          <header class="landing__section-copy">
            <p class="landing__kicker">{{ t('landing.pillars.shinobi.kicker') }}</p>
            <h2 class="page-title">{{ t('landing.pillars.shinobi.title') }}</h2>
            <p class="landing__section-lead">{{ t('landing.pillars.shinobi.lead') }}</p>
          </header>
          <ul class="landing__portraits stagger" aria-hidden="true">
            <li
              v-for="(id, index) in showcasePortraits"
              :key="id"
              class="landing__portrait"
              :style="{ '--i': index }"
            >
              <NinjaPortrait :avatar-id="id" />
            </li>
          </ul>
        </div>
      </section>

      <!-- Fan de cartes -->
      <section class="landing__band landing__band--cards">
        <div class="landing__band-inner landing__band-inner--split">
          <header class="landing__section-copy">
            <p class="landing__kicker">{{ t('landing.pillars.deck.kicker') }}</p>
            <h2 class="page-title">{{ t('landing.pillars.deck.title') }}</h2>
            <p class="landing__section-lead">{{ t('landing.pillars.deck.lead') }}</p>
          </header>
          <div class="landing__card-fan" aria-hidden="true">
            <figure
              v-for="(card, index) in showcaseCards"
              :key="card.src"
              class="landing__card"
              :data-tone="card.tone"
              :style="{ '--i': index }"
            >
              <img :src="card.src" alt="" loading="lazy" decoding="async" />
            </figure>
          </div>
        </div>
      </section>

      <!-- Piliers visuels : missions / préparation -->
      <section class="landing__pillars">
        <article
          v-for="(pillar, index) in pillars"
          :key="pillar.key"
          class="landing__pillar"
          :data-tone="pillar.tone"
          :style="{ '--i': index }"
        >
          <div class="landing__pillar-media" aria-hidden="true">
            <img :src="pillar.image" alt="" loading="lazy" decoding="async" />
          </div>
          <div class="landing__pillar-copy">
            <p class="landing__kicker">{{ t(`landing.pillars.${pillar.key}.kicker`) }}</p>
            <h2 class="t-heading">{{ t(`landing.pillars.${pillar.key}.title`) }}</h2>
            <p>{{ t(`landing.pillars.${pillar.key}.lead`) }}</p>
          </div>
        </article>
      </section>

      <!-- Première session -->
      <section class="landing__session">
        <div class="landing__pitch">
          <p class="landing__pitch-kicker">{{ t('landing.asideTitle') }}</p>
          <p class="landing__pitch-body">{{ t('landing.asideBody') }}</p>
        </div>

        <div class="landing__timeline">
          <div class="section-head">
            <span class="section-head__index">01</span>
            <h2 class="section-head__title">{{ t('landing.timelineTitle') }}</h2>
            <span class="section-head__rule" />
          </div>
          <p class="mt-3 text-ink-muted">{{ t('landing.timelineRealtime') }}</p>
          <ol class="landing__steps">
            <li v-for="(key, index) in timeline" :key="key" class="landing__step">
              <span class="landing__step-index" aria-hidden="true">{{ index + 1 }}</span>
              <p>{{ t(key) }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- CTA final -->
      <section class="landing__close">
        <div class="landing__close-inner">
          <h2 class="t-display landing__close-title">{{ t('landing.closeTitle') }}</h2>
          <p class="landing__close-lead">{{ t('landing.closeLead') }}</p>
          <div class="landing__actions">
            <button
              type="button"
              class="btn-primary btn-lg"
              :disabled="auth.loading"
              @click="playAsGuest"
            >
              {{ auth.loading ? t('auth.loading') : t('landing.playGuest') }}
            </button>
            <router-link to="/register" class="btn-ghost btn-lg landing__cta-ghost">
              {{ t('landing.createAccount') }}
            </router-link>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  min-height: 100dvh;
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
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding: 1rem var(--space-gutter);
}

.landing__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: -0.01em;
  color: var(--color-gold-fill);
}

.landing__nav {
  display: flex;
  align-items: center;
  gap: 0.35rem 1.1rem;
}

.landing__nav-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-on-fill);
  text-decoration: none;
  transition: color var(--dur-fast) ease;
}

.landing__nav-link:hover {
  color: var(--color-gold-fill);
}

.landing__nav-register {
  border-color: color-mix(in srgb, var(--color-on-fill) 40%, transparent);
  color: var(--color-on-fill);
  background: color-mix(in srgb, var(--color-on-fill) 10%, transparent);
}

/* ——— Hero full-bleed ——— */

.landing__hero {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  align-items: stretch;
  min-height: min(92dvh, 46rem);
  overflow: hidden;
  color: var(--color-on-fill);
}

.landing__hero-media {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.landing__hero-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 42% center;
  filter: var(--image-filter);
  transform: scale(1.04);
  animation: landing- ken 18s var(--ease-out-quint) both;
}

.landing__hero-veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-indigo-deep) 55%, transparent) 0%,
      color-mix(in srgb, var(--color-indigo-deep) 28%, transparent) 38%,
      color-mix(in srgb, var(--color-indigo-deep) 78%, transparent) 100%
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-indigo-deep) 72%, transparent) 0%,
      color-mix(in srgb, var(--color-indigo-deep) 18%, transparent) 58%,
      transparent 100%
    );
}

.landing__hero-copy {
  position: relative;
  z-index: 2;
  width: min(40rem, 100%);
  padding: clamp(2rem, 6vw, 4.5rem) var(--space-gutter) clamp(2.5rem, 7vw, 4.75rem);
}

.landing__brand-hero {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 1.1rem + 2vw, 2.35rem);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.02em;
  color: var(--color-gold-fill);
}

.landing__title {
  margin-top: 1rem;
  max-width: 13ch;
  color: var(--color-on-fill);
  text-wrap: balance;
}

.landing__lead {
  max-width: 34rem;
  margin-top: 1rem;
  font-size: 1.0625rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-on-fill) 82%, transparent);
}

.landing__actions {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.5rem;
}

.landing__cta-ghost {
  color: var(--color-on-fill);
  border-color: color-mix(in srgb, var(--color-on-fill) 35%, transparent);
}

.landing__cta-ghost:hover {
  background: color-mix(in srgb, var(--color-on-fill) 12%, transparent);
}

.landing__hint {
  max-width: 32rem;
  margin-top: 1rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-on-fill) 68%, transparent);
}

/* ——— Sections ——— */

.landing__kicker {
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.landing__section-lead {
  max-width: 36rem;
  margin-top: 0.85rem;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.landing__band {
  padding-block: clamp(2.5rem, 7vw, 5rem);
}

.landing__band-inner {
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.landing__band-inner--split {
  display: grid;
  gap: 2rem;
  align-items: center;
}

.landing__band--portraits {
  background: var(--color-bg-soft);
}

.landing__portraits {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 1.75rem 0 0;
  padding: 0;
  list-style: none;
}

.landing__portrait {
  overflow: hidden;
  border: 1px solid var(--color-line);
  background: var(--color-bg-card);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--color-ink) 8%, transparent);
  transition: transform 280ms var(--ease-out-quint);
}

.landing__portrait:nth-child(even) {
  transform: translateY(0.65rem);
}

.landing__portrait:hover {
  transform: translateY(-0.25rem);
}

.landing__band--cards {
  background: var(--color-bg);
}

.landing__card-fan {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 16rem;
  padding-block: 1rem 0.5rem;
}

.landing__card {
  width: min(8.5rem, 22vw);
  margin-inline: -1.1rem;
  overflow: hidden;
  border: 2px solid var(--color-line-strong);
  background: var(--color-bg-card);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--color-ink) 16%, transparent);
  transition: transform 320ms var(--ease-out-quint);
}

.landing__card:nth-child(1) {
  transform: rotate(-12deg) translateY(1.1rem);
}
.landing__card:nth-child(2) {
  transform: rotate(-5deg) translateY(0.45rem);
}
.landing__card:nth-child(3) {
  transform: rotate(0deg) translateY(0);
}
.landing__card:nth-child(4) {
  transform: rotate(5deg) translateY(0.45rem);
}
.landing__card:nth-child(5) {
  transform: rotate(12deg) translateY(1.1rem);
}

.landing__card img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.landing__card:hover {
  z-index: 2;
  transform: rotate(0deg) translateY(-0.5rem) scale(1.04);
}

.landing__pillars {
  display: grid;
  gap: 0;
}

.landing__pillar {
  display: grid;
  min-height: clamp(16rem, 42vw, 22rem);
  background: var(--color-bg-soft);
}

.landing__pillar-media {
  min-height: 12rem;
  overflow: hidden;
}

.landing__pillar-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter);
}

.landing__pillar-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.65rem;
  padding: clamp(1.5rem, 4vw, 2.75rem);
  border-top: 4px solid var(--tone-fill);
}

.landing__pillar-copy p:last-child {
  max-width: 34rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.landing__session {
  display: grid;
  gap: 2.5rem;
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding: clamp(2.5rem, 7vw, 5rem) var(--space-gutter);
}

.landing__pitch {
  position: relative;
  padding: clamp(1.5rem, 5vw, 2.75rem);
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
}

.landing__pitch-kicker {
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-gold-fill);
}

.landing__pitch-body {
  margin-top: 1rem;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 1.1rem + 1.8vw, 2.25rem);
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.12;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.landing__steps {
  margin-top: 1.5rem;
  list-style: none;
  padding: 0;
}

.landing__step {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  gap: 1rem;
  align-items: baseline;
  padding-block: 0.9rem;
  border-top: 1px solid var(--color-line);
  line-height: 1.55;
}

.landing__step-index {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 800;
  font-stretch: 76%;
  line-height: 0.9;
  color: var(--color-vermilion);
}

.landing__close {
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
}

.landing__close-inner {
  width: 100%;
  max-width: 46rem;
  margin-inline: auto;
  padding: clamp(2.75rem, 8vw, 5rem) var(--space-gutter);
  text-align: center;
}

.landing__close-title {
  max-width: 14ch;
  margin-inline: auto;
  color: var(--color-on-fill);
  text-wrap: balance;
}

.landing__close-lead {
  max-width: 34rem;
  margin: 1rem auto 0;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-on-fill) 78%, transparent);
}

.landing__close .landing__actions {
  justify-content: center;
}

@keyframes landing-ken {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(1.02);
  }
}

@media (max-width: 639px) {
  .landing__portraits {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .landing__portrait:nth-child(n + 4) {
    display: none;
  }

  .landing__card:nth-child(1),
  .landing__card:nth-child(5) {
    display: none;
  }
}

@media (min-width: 768px) {
  .landing__band-inner--split {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 3rem;
  }

  .landing__pillar {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  }

  .landing__pillar:nth-child(even) .landing__pillar-media {
    order: 2;
  }

  .landing__pillar-copy {
    border-top: 0;
    border-inline-start: 4px solid var(--tone-fill);
  }

  .landing__session {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 4rem;
    align-items: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__hero-image,
  .landing__portrait,
  .landing__card {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
