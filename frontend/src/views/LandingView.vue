<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue';
import gateImage from '../assets/illustrations/village-gate.webp';

defineOptions({ name: 'LandingView' });

const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const characterName = ref('');

const features = [
  { key: 'landing.features.character', tone: 'vermilion' },
  { key: 'landing.features.deck', tone: 'sky' },
  { key: 'landing.features.talents', tone: 'leaf' },
  { key: 'landing.features.missions', tone: 'gold' },
];

const timeline = [
  'landing.timeline.create',
  'landing.timeline.build',
  'landing.timeline.grow',
  'landing.timeline.fight',
];

async function playAsGuest() {
  const ok = await auth.loginAsGuest({
    characterName: characterName.value.trim(),
    language: locale.value === 'en' ? 'en' : 'fr',
  });
  if (ok) router.push('/home');
}
</script>

<template>
  <div class="landing" data-testid="landing-page">
    <header class="landing__bar">
      <p class="landing__brand">
        <BrandMark size="1.625rem" class="text-vermilion" />
        <span>{{ t('app.name') }}</span>
      </p>
      <nav class="landing__nav">
        <LocaleSwitcher data-testid="landing-locale-switcher" />
        <router-link to="/rules" class="landing__nav-link" data-testid="landing-rules-link">
          {{ t('rules.link') }}
        </router-link>
        <router-link to="/login" class="landing__nav-link">{{ t('auth.login') }}</router-link>
        <router-link to="/register" class="btn-secondary btn-sm">{{
          t('auth.register')
        }}</router-link>
        <ThemeToggle />
      </nav>
    </header>

    <main>
      <section class="landing__hero" data-testid="landing-hero">
        <div class="landing__intro">
          <p class="landing__kicker">{{ t('landing.kicker') }}</p>
          <h1 class="t-display landing__title">{{ t('landing.title') }}</h1>
          <p class="landing__lead">{{ t('landing.lead') }}</p>

          <div class="landing__actions">
            <form class="landing__guest-form" @submit.prevent="playAsGuest">
              <label class="field">
                <span class="field__label">{{ t('player.nameLabel') }}</span>
                <input
                  v-model="characterName"
                  type="text"
                  required
                  minlength="2"
                  maxlength="100"
                  data-testid="landing-guest-name"
                  class="input-field"
                />
              </label>
              <button
                type="submit"
                class="btn-primary btn-lg"
                data-testid="landing-guest"
                :disabled="auth.loading || characterName.trim().length < 2"
              >
                {{ auth.loading ? t('auth.loading') : t('landing.playGuest') }}
              </button>
            </form>
            <router-link to="/register" class="btn-ghost btn-lg">
              {{ t('landing.createAccount') }}
            </router-link>
          </div>

          <p class="landing__hint">{{ t('landing.guestHint') }}</p>
          <p v-if="auth.error" class="alert alert--error mt-4">{{ auth.error }}</p>
        </div>

        <div class="landing__visual" aria-hidden="true">
          <img class="landing__image" :src="gateImage" alt="" decoding="async" />
        </div>
      </section>

      <section class="landing__features">
        <div class="section-head">
          <span class="section-head__index">01</span>
          <h2 class="section-head__title">{{ t('landing.featuresTitle') }}</h2>
          <span class="section-head__rule" />
        </div>
        <ul class="landing__feature-grid stagger">
          <li
            v-for="(feature, index) in features"
            :key="feature.key"
            class="landing__feature"
            :data-tone="feature.tone"
            :style="{ '--i': index }"
          >
            <span class="landing__feature-shape" aria-hidden="true" />
            <p>{{ t(feature.key) }}</p>
          </li>
        </ul>
      </section>

      <section class="landing__session">
        <div class="landing__pitch">
          <p class="landing__pitch-kicker">{{ t('landing.asideTitle') }}</p>
          <p class="landing__pitch-body">{{ t('landing.asideBody') }}</p>
        </div>

        <div class="landing__timeline">
          <div class="section-head">
            <span class="section-head__index">02</span>
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
    </main>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: clip;
  background: var(--color-bg);
}

.landing__bar,
.landing__features,
.landing__session {
  width: 100%;
  max-width: 76rem;
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.landing__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-block: 1rem;
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
}

.landing__nav {
  display: flex;
  align-items: center;
  gap: 0.35rem 1.1rem;
}

.landing__nav-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
  transition: color var(--dur-fast) ease;
}

.landing__nav-link:hover {
  color: var(--color-accent);
}

/* ——— Hero split (texte gauche / image droite) ——— */

.landing__hero {
  position: relative;
  display: grid;
  gap: 0;
  align-items: stretch;
  min-height: clamp(16rem, 48vw, 24rem);
  margin-bottom: clamp(1.5rem, 4vw, 3rem);
  border-bottom: 1px solid var(--color-line);
  overflow: hidden;
  background: var(--color-bg);
}

.landing__intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: clamp(1.5rem, 4vw, 3rem) var(--space-gutter);
  max-width: 38rem;
}

.landing__kicker {
  margin: 0;
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
  animation: slide-in-left 480ms var(--ease-out-quint) both;
}

.landing__title {
  margin-top: 0.85rem;
  max-width: 12ch;
  animation: rise-in 620ms var(--ease-out-quint) 60ms both;
}

.landing__lead {
  max-width: 34rem;
  margin-top: 1rem;
  font-size: 1.0625rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
  animation: rise-in 620ms var(--ease-out-quint) 140ms both;
}

.landing__actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1.5rem;
  animation: rise-in 620ms var(--ease-out-quint) 220ms both;
}

.landing__guest-form {
  display: grid;
  flex: 1;
  gap: 0.6rem;
  max-width: 24rem;
}

.landing__hint {
  max-width: 30rem;
  margin-top: 1rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--color-ink-faint);
}

.landing__visual {
  position: relative;
  order: -1;
  min-height: clamp(11rem, 48vw, 16rem);
  overflow: hidden;
  pointer-events: none;
}

.landing__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter);
}

/* ——— Promesses ——— */

.landing__features {
  padding-block: clamp(2rem, 5vw, 4rem);
}

.landing__feature-grid {
  display: grid;
  gap: 1.75rem;
  margin-top: 2rem;
}

.landing__feature {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  line-height: 1.6;
  color: var(--color-ink);
}

.landing__feature-shape {
  width: 1.5rem;
  height: 1.5rem;
  margin-top: 0.15rem;
  background: var(--tone-fill);
}

.landing__feature:nth-child(1) .landing__feature-shape {
  transform: rotate(45deg) scale(0.82);
}

.landing__feature:nth-child(2) .landing__feature-shape {
  border-radius: 50%;
}

.landing__feature:nth-child(3) .landing__feature-shape {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

/* ——— Pitch + première session ——— */

.landing__session {
  display: grid;
  gap: 2.5rem;
  padding-block: clamp(1rem, 4vw, 3rem) clamp(3rem, 8vw, 6rem);
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

@media (min-width: 640px) {
  .landing__actions {
    flex-direction: row;
    align-items: center;
  }

  .landing__feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem 2.5rem;
  }
}

@media (min-width: 768px) {
  .landing__hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .landing__intro {
    max-width: none;
    padding-inline: clamp(1.5rem, 5vw, 4rem);
  }

  .landing__visual {
    order: 0;
    min-height: 0;
    height: 100%;
  }

  .landing__image {
    object-position: 46% center;
  }
}

@media (min-width: 1024px) {
  .landing__feature-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .landing__feature {
    grid-template-columns: minmax(0, 1fr);
    padding-top: 1.1rem;
    border-top: 3px solid var(--tone-fill);
  }

  .landing__session {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 4rem;
    align-items: start;
  }
}
</style>
