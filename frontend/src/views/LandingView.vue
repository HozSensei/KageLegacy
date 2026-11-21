<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue';
import SiteFooter from '../components/layout/SiteFooter.vue';
import LandingCardCarousel from '../components/landing/LandingCardCarousel.vue';
import gateImage from '../assets/illustrations/village-gate.webp';
import forestImage from '../assets/illustrations/forest-path.webp';

defineOptions({ name: 'LandingView' });

const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const features = [
  { key: 'talents', tone: 'leaf' },
  { key: 'missions', tone: 'gold' },
  { key: 'season', tone: 'wood' },
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
      <!-- Hero : atmosphère + marque + CTA ; cartes qui débordent sur la section suivante -->
      <section class="landing__hero" data-testid="landing-hero">
        <div class="landing__hero-backdrop" aria-hidden="true">
          <div class="landing__hero-media">
            <img class="landing__hero-image" :src="gateImage" alt="" decoding="async" />
          </div>
          <div class="landing__hero-veil" />
        </div>

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

        <div class="landing__hero-body">
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

          <div class="landing__hero-cards anim-rise" style="--delay: 200ms">
            <LandingCardCarousel :visible="2" :pool-size="9" :autoplay-ms="0" />
          </div>
        </div>
      </section>

      <!-- Collection : image ~40 % à gauche (déborde sur les atouts) + texte plus bas à droite -->
      <section class="landing__bridge">
        <div class="landing__bridge-inner">
          <figure class="landing__bridge-media" aria-hidden="true">
            <img :src="forestImage" alt="" loading="lazy" decoding="async" />
          </figure>
          <header class="landing__bridge-copy">
            <p class="landing__kicker">{{ t('landing.pillars.deck.kicker') }}</p>
            <h2 class="page-title">{{ t('landing.pillars.deck.title') }}</h2>
            <p class="landing__section-lead">{{ t('landing.pillars.deck.lead') }}</p>
          </header>
        </div>
      </section>

      <!-- Atouts : grille sans images plein écran -->
      <section class="landing__features">
        <div class="landing__features-inner">
          <article
            v-for="feature in features"
            :key="feature.key"
            class="landing__feature"
            :data-tone="feature.tone"
          >
            <p class="landing__kicker">{{ t(`landing.pillars.${feature.key}.kicker`) }}</p>
            <h2 class="t-heading">{{ t(`landing.pillars.${feature.key}.title`) }}</h2>
            <p>{{ t(`landing.pillars.${feature.key}.lead`) }}</p>
          </article>
        </div>
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
    <SiteFooter />
  </div>
</template>

<style scoped>
.landing {
  /* Cartes hero → empiètent fort sur Collection ; image Collection → déborde sur Atouts */
  --landing-card-overhang: clamp(5rem, 9vw, 7rem);
  --landing-media-overhang: clamp(4.5rem, 8vw, 6.5rem);
  min-height: 100vh;
  min-height: 100dvh;
  overflow: visible;
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

/* ——— Hero ——— */

.landing__hero {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: min(72dvh, 40rem);
  margin-bottom: calc(var(--landing-card-overhang) * -1);
  overflow: visible;
  color: var(--color-on-fill);
  /* Fond déjà teinté section 2 pour que le dégradé atterrisse sans coupure */
  background: var(--color-bg-soft);
}

.landing__hero-backdrop {
  position: absolute;
  inset: 0;
  bottom: calc(var(--landing-card-overhang) * -0.35);
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.landing__hero-media {
  position: absolute;
  inset: 0;
}

.landing__hero-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 38% 42%;
  opacity: 0.5;
  filter: var(--image-filter) saturate(0.92);
  transform: scale(1.03);
  animation: landing-ken 18s var(--ease-out-quint) both;
  /* L’illustration s’efface progressivement vers la section 2 */
  -webkit-mask-image: linear-gradient(
    180deg,
    #000 0%,
    #000 36%,
    rgba(0, 0, 0, 0.65) 58%,
    rgba(0, 0, 0, 0.2) 78%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    #000 0%,
    #000 36%,
    rgba(0, 0, 0, 0.65) 58%,
    rgba(0, 0, 0, 0.2) 78%,
    transparent 100%
  );
}

.landing__hero-veil {
  position: absolute;
  inset: 0;
  background:
    /* Lisibilité à gauche (s’atténue aussi vers le bas) */
    linear-gradient(
      180deg,
      transparent 0%,
      transparent 55%,
      var(--color-bg-soft) 100%
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-indigo-deep) 78%, transparent) 0%,
      color-mix(in srgb, var(--color-indigo-deep) 28%, transparent) 48%,
      transparent 78%
    ),
    /* Haut indigo → bas = couleur section 2 */
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-indigo-deep) 72%, transparent) 0%,
      color-mix(in srgb, var(--color-indigo-deep) 28%, transparent) 32%,
      color-mix(in srgb, var(--color-bg-soft) 35%, transparent) 55%,
      color-mix(in srgb, var(--color-bg-soft) 82%, transparent) 78%,
      var(--color-bg-soft) 100%
    );
}

.landing__hero-body {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 1.75rem;
  align-items: end;
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding: clamp(1.5rem, 4vw, 2.75rem) var(--space-gutter) 0;
}

.landing__hero-copy {
  align-self: center;
  width: min(36rem, 100%);
  padding-bottom: clamp(2rem, 5vw, 3.5rem);
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
  margin-top: 0.85rem;
  max-width: 14ch;
  font-size: clamp(2rem, 1.35rem + 2.4vw, 3.15rem);
  color: var(--color-on-fill);
  text-wrap: balance;
}

.landing__lead {
  max-width: 34rem;
  margin-top: 0.9rem;
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

.landing__hero-cards {
  position: relative;
  z-index: 4;
  width: 100%;
  max-width: min(42rem, 100%);
  justify-self: end;
  padding-bottom: 0;
  margin-inline-end: calc(-1 * var(--space-gutter));
}

/* ——— Bridge collection (image ↔ hero) ——— */

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

.landing__bridge {
  position: relative;
  z-index: 1;
  /* Même fond que la fin du dégradé hero — enchaînement continu */
  background: var(--color-bg-soft);
  /* Place pour les cartes qui descendent + image qui descend vers Atouts */
  padding-top: calc(var(--landing-card-overhang) + 1.25rem);
  padding-bottom: calc(clamp(2rem, 5vw, 3.25rem) + var(--landing-media-overhang));
  margin-bottom: calc(var(--landing-media-overhang) * -1);
}

.landing__bridge-inner {
  display: grid;
  gap: 1.75rem;
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding-inline: var(--space-gutter);
  align-items: start;
}

.landing__bridge-media {
  position: relative;
  z-index: 3;
  width: min(100%, 22rem);
  /* Sous les cartes, puis déborde vers le bas sur Atouts — pas vers le hero */
  margin: clamp(1rem, 3vw, 2rem) 0 calc(var(--landing-media-overhang) * -1);
  overflow: hidden;
  border: 1px solid var(--color-line);
  background: var(--color-bg-card);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--color-ink) 14%, transparent);
  justify-self: start;
}

.landing__bridge-media img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  object-position: 50% 40%;
  filter: var(--image-filter);
}

.landing__bridge-copy {
  /* Bien sous les cartes hero — évite de coller aux CardDisplay */
  padding-top: clamp(4.5rem, 9vw, 7.5rem);
  padding-bottom: 0.5rem;
}

.landing__bridge-copy .page-title {
  font-size: clamp(2.15rem, 1.45rem + 2.6vw, 3.35rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.landing__bridge-copy .landing__section-lead {
  max-width: 34rem;
  margin-top: 1rem;
  font-size: clamp(1.08rem, 1rem + 0.35vw, 1.22rem);
  line-height: 1.55;
}

/* ——— Features / session / close ——— */

.landing__features {
  position: relative;
  z-index: 0;
  background: var(--color-bg);
  border-block: 1px solid var(--color-line);
}

.landing__features-inner {
  display: grid;
  gap: 1.25rem;
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding: calc(clamp(2.25rem, 5vw, 3.75rem) + var(--landing-media-overhang)) var(--space-gutter)
    clamp(2.25rem, 5vw, 3.75rem);
}

.landing__feature {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.35rem 1.25rem 1.45rem;
  border-top: 4px solid var(--tone-fill);
  background: var(--color-bg-soft);
}

.landing__feature p:last-child {
  margin: 0;
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
  padding: clamp(2.5rem, 6vw, 4.5rem) var(--space-gutter);
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
  font-size: clamp(1.35rem, 1.05rem + 1.4vw, 2rem);
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.15;
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
  font-size: 2rem;
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
  padding: clamp(2.75rem, 7vw, 4.5rem) var(--space-gutter);
  text-align: center;
}

.landing__close-title {
  max-width: 14ch;
  margin-inline: auto;
  font-size: clamp(1.85rem, 1.25rem + 2vw, 2.75rem);
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
    transform: scale(1.06);
  }
  to {
    transform: scale(1.02);
  }
}

@media (max-width: 639px) {
  .landing {
    --landing-card-overhang: clamp(3.5rem, 14vw, 5rem);
    --landing-media-overhang: clamp(2rem, 9vw, 3rem);
  }

  .landing__bridge-media {
    width: min(100%, 18rem);
  }
}

@media (min-width: 768px) {
  .landing__hero-body {
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 1fr);
    gap: 2.5rem;
    align-items: end;
  }

  .landing__hero-copy {
    align-self: center;
    padding-bottom: clamp(2.5rem, 6vw, 4rem);
  }

  .landing__hero-cards {
    justify-self: end;
    max-width: min(44rem, 100%);
  }

  .landing__bridge-inner {
    /* ~40 % image / ~60 % texte */
    grid-template-columns: minmax(0, 0.4fr) minmax(0, 0.6fr);
    gap: 2.75rem;
    align-items: start;
  }

  .landing__bridge-media {
    width: 100%;
  }

  .landing__bridge-copy {
    padding-top: clamp(5.5rem, 10vw, 8.5rem);
  }

  .landing__features-inner {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }

  .landing__session {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 4rem;
    align-items: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__hero-image {
    animation: none !important;
    transform: none !important;
  }
}
</style>
