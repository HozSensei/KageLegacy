<script setup>
import { computed, nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppIcon from '../components/ui/AppIcon.vue';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import LocaleSwitcher from '../components/layout/LocaleSwitcher.vue';
import SiteFooter from '../components/layout/SiteFooter.vue';
import { renderMarkdown } from '../utils/renderMarkdown.js';
import { addHeadingAnchors } from '../utils/parseRulesDoc.js';
import legalFr from '../content/legal.fr.md?raw';
import legalEn from '../content/legal.en.md?raw';

defineOptions({ name: 'LegalView' });

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const markdown = computed(() => (locale.value === 'en' ? legalEn : legalFr));
const html = computed(() => addHeadingAnchors(renderMarkdown(markdown.value)));

function goBack() {
  if (auth.user) {
    router.push('/home');
    return;
  }
  router.push('/');
}

async function applyRouteHash() {
  const hash = route.hash?.replace(/^#/, '');
  if (!hash) return;
  await nextTick();
  requestAnimationFrame(() => {
    document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  });
}

watch([html, () => route.hash], applyRouteHash, { flush: 'post' });
onMounted(applyRouteHash);
</script>

<template>
  <div class="legal-page" data-testid="legal-page">
    <header class="legal-page__header">
      <div class="legal-page__header-inner">
        <button type="button" class="btn-ghost btn-sm" data-testid="legal-back" @click="goBack">
          <AppIcon name="arrow-left" size="1rem" />
          {{ auth.user ? t('legal.backToGame') : t('legal.backHome') }}
        </button>
        <p class="legal-page__title">
          <BrandMark size="1.5rem" />
          {{ t('legal.pageTitle') }}
        </p>
        <div class="legal-page__tools">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="legal-page__main">
      <article class="rules-doc" data-testid="legal-content" v-html="html" />
    </main>

    <SiteFooter tone="paper" />
  </div>
</template>

<style scoped>
.legal-page {
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-ink);
}

.legal-page__header {
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg-soft);
}

.legal-page__header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  width: min(52rem, 100%);
  margin-inline: auto;
  padding: 0.85rem var(--space-gutter);
}

.legal-page__title {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
}

.legal-page__tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.legal-page__main {
  width: min(52rem, 100%);
  margin-inline: auto;
  padding: clamp(1.5rem, 4vw, 2.75rem) var(--space-gutter) 3rem;
}
</style>
