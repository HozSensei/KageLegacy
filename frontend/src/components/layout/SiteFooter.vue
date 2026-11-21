<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BrandMark from '../ui/BrandMark.vue';

defineOptions({ name: 'SiteFooter' });

defineProps({
  /** Variante sombre (landing) ou claire (pages docs). */
  tone: {
    type: String,
    default: 'ink',
    validator: v => ['ink', 'paper'].includes(v),
  },
});

const { t, locale } = useI18n();
const year = new Date().getFullYear();
/** Injecté au build Docker (tag de release), vide en local. */
const appVersion = (import.meta.env.VITE_APP_VERSION || '').trim();
const privacyHash = computed(() =>
  locale.value === 'en' ? 'personal-data' : 'donnees-personnelles'
);
</script>

<template>
  <footer class="site-footer" :data-tone="tone" data-testid="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand-block">
        <router-link to="/" class="site-footer__brand" :aria-label="t('app.name')">
          <BrandMark size="1.75rem" />
          <span>{{ t('app.name') }}</span>
        </router-link>
        <p class="site-footer__tagline">{{ t('footer.tagline') }}</p>
      </div>

      <div class="site-footer__cols">
        <div class="site-footer__col">
          <p class="site-footer__heading">{{ t('footer.play') }}</p>
          <router-link to="/register">{{ t('auth.register') }}</router-link>
          <router-link to="/login">{{ t('auth.login') }}</router-link>
          <router-link to="/">{{ t('footer.tryGuest') }}</router-link>
        </div>
        <div class="site-footer__col">
          <p class="site-footer__heading">{{ t('footer.discover') }}</p>
          <router-link to="/rules">{{ t('rules.link') }}</router-link>
          <router-link to="/legal">{{ t('footer.legal') }}</router-link>
        </div>
        <div class="site-footer__col">
          <p class="site-footer__heading">{{ t('footer.account') }}</p>
          <p class="site-footer__note">{{ t('footer.accountNote') }}</p>
        </div>
      </div>
    </div>

    <div class="site-footer__bottom">
      <p class="site-footer__copy">
        © {{ year }} {{ t('app.name') }}. {{ t('footer.rights') }}
        <span
          v-if="appVersion"
          class="site-footer__version"
          data-testid="app-version"
        >{{ t('footer.version', { version: appVersion }) }}</span>
      </p>
      <nav class="site-footer__legal-links" :aria-label="t('footer.legal')">
        <router-link to="/legal">{{ t('footer.legalShort') }}</router-link>
        <router-link :to="`/legal#${privacyHash}`">{{ t('footer.privacy') }}</router-link>
        <router-link to="/rules">{{ t('rules.link') }}</router-link>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  --sf-bg: var(--color-indigo-deep);
  --sf-ink: var(--color-on-fill);
  --sf-muted: color-mix(in srgb, var(--color-on-fill) 68%, transparent);
  --sf-line: color-mix(in srgb, var(--color-on-fill) 16%, transparent);
  --sf-accent: var(--color-gold-fill);

  background: var(--sf-bg);
  color: var(--sf-ink);
}

.site-footer[data-tone='paper'] {
  --sf-bg: var(--color-bg-soft);
  --sf-ink: var(--color-ink);
  --sf-muted: var(--color-ink-muted);
  --sf-line: var(--color-line);
  --sf-accent: var(--color-vermilion);
}

.site-footer__inner {
  display: grid;
  gap: 2rem;
  width: min(76rem, 100%);
  margin-inline: auto;
  padding: clamp(2rem, 5vw, 3rem) var(--space-gutter) 1.5rem;
}

.site-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 80%;
  color: inherit;
  text-decoration: none;
}

.site-footer__tagline {
  max-width: 28rem;
  margin: 0.75rem 0 0;
  line-height: 1.5;
  color: var(--sf-muted);
  font-size: 0.9rem;
}

.site-footer__cols {
  display: grid;
  gap: 1.5rem;
}

.site-footer__col {
  display: grid;
  gap: 0.45rem;
  align-content: start;
}

.site-footer__heading {
  margin: 0 0 0.25rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sf-accent);
}

.site-footer__col a {
  color: var(--sf-ink);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.site-footer__col a:hover {
  color: var(--sf-accent);
}

.site-footer__note {
  margin: 0;
  max-width: 18rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--sf-muted);
}

.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  width: min(76rem, 100%);
  margin-inline: auto;
  padding: 1rem var(--space-gutter) 1.35rem;
  border-top: 1px solid var(--sf-line);
}

.site-footer__copy {
  margin: 0;
  font-size: 0.78rem;
  color: var(--sf-muted);
}

.site-footer__version {
  margin-left: 0.35rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}

.site-footer__legal-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.1rem;
}

.site-footer__legal-links a {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sf-muted);
  text-decoration: none;
}

.site-footer__legal-links a:hover {
  color: var(--sf-accent);
}

@media (min-width: 720px) {
  .site-footer__inner {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr);
    align-items: start;
  }

  .site-footer__cols {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
