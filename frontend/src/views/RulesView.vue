<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppIcon from '../components/ui/AppIcon.vue';
import BrandMark from '../components/ui/BrandMark.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import SiteFooter from '../components/layout/SiteFooter.vue';
import { renderMarkdown } from '../utils/renderMarkdown.js';
import { addHeadingAnchors, filterRulesNav, parseRulesNav } from '../utils/parseRulesDoc.js';
import rulesFr from '../content/rules.fr.md?raw';
import rulesEn from '../content/rules.en.md?raw';
import { useOnboardingVisit } from '../composables/useOnboardingVisit.js';

defineOptions({ name: 'RulesView' });

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
useOnboardingVisit('visit_rules');

const sidebarOpen = ref(false);
const activeSectionId = ref('');
const navQuery = ref('');
const contentRef = ref(null);
let observer = null;

// Canonical section IDs are language-independent; keep both localized slugs as aliases.
const sectionIds = [
  ['overview', 'en-bref', 'at-a-glance'],
  ['ninja', 'votre-ninja', 'your-ninja'],
  ['cards', 'les-cartes', 'cards'],
  ['deck', 'le-deck', 'the-deck'],
  ['talents', 'les-talents', 'the-talent-tree'],
  ['combat', 'le-combat', 'combat'],
  ['missions', 'missions-et-parcours', 'missions-and-runs'],
  ['shop', 'la-boutique', 'the-shop'],
  ['season-pass', 'le-passe-de-saison', 'the-season-pass'],
  ['resources', 'monnaies-et-ressources', 'currencies-and-resources'],
  ['update-history', 'historique-des-mises-a-jour', 'update-history'],
];
const canonicalIds = new Map(
  sectionIds.flatMap(([id, ...aliases]) => [id, ...aliases].map(alias => [alias, id]))
);
const canonicalId = id => canonicalIds.get(id) || id;

const markdown = computed(() => (locale.value === 'en' ? rulesEn : rulesFr));

const navSections = computed(() =>
  parseRulesNav(markdown.value).map(section => ({
    ...section,
    id: canonicalId(section.id),
    children: (section.children || []).map(child => ({
      ...child,
      id: canonicalId(child.id),
    })),
  }))
);

const filteredNavSections = computed(() => filterRulesNav(navSections.value, navQuery.value));

const parentByChildId = computed(() => {
  const map = new Map();
  for (const section of navSections.value) {
    for (const child of section.children || []) {
      map.set(child.id, section.id);
    }
  }
  return map;
});

const activeParentId = computed(
  () => parentByChildId.value.get(activeSectionId.value) || activeSectionId.value
);

const html = computed(() =>
  addHeadingAnchors(renderMarkdown(markdown.value)).replace(
    /<h2 id="([^"]+)"([^>]*)><a class="rules-doc__anchor" href="#[^"]+">/g,
    (_match, id, attributes) => {
      const canonical = canonicalId(id);
      return `<h2 id="${canonical}"${attributes}><a class="rules-doc__anchor" href="#${canonical}">`;
    }
  )
);

function goBack() {
  if (auth.user) {
    router.push('/home');
    return;
  }
  router.push('/');
}

function scrollToSection(id) {
  sidebarOpen.value = false;
  if (route.hash === `#${id}`) {
    applyRouteHash();
  } else {
    router.push({ hash: `#${id}` });
  }
}

function handleContentClick(event) {
  const link = event.target.closest('a.rules-doc__anchor');
  if (
    !link ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  scrollToSection(link.getAttribute('href').slice(1));
}

function setupObserver() {
  observer?.disconnect();
  const root = contentRef.value;
  if (!root) return;

  const headings = root.querySelectorAll('h2[id], h3[id]');
  if (!headings.length) return;

  observer = new IntersectionObserver(
    entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]?.target?.id) {
        activeSectionId.value = visible[0].target.id;
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
  );

  headings.forEach(heading => observer.observe(heading));
}

function applyRouteHash() {
  const hash = route.hash?.replace(/^#/, '');
  if (!hash) return;
  requestAnimationFrame(() => {
    const id = canonicalId(hash);
    const el = document.getElementById(id);
    if (!el || !contentRef.value?.contains(el)) return;
    el.scrollIntoView({ block: 'start' });
    activeSectionId.value = id;
  });
}

watch(
  html,
  () => {
    setupObserver();
    applyRouteHash();
  },
  { flush: 'post' }
);

watch(() => route.hash, applyRouteHash);

watch(locale, () => {
  navQuery.value = '';
});

onMounted(() => {
  setupObserver();
  applyRouteHash();
});

onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div class="rules-layout" data-testid="rules-page">
    <header class="rules-layout__header">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-8">
        <button type="button" class="btn-ghost btn-sm" data-testid="rules-back" @click="goBack">
          <AppIcon name="arrow-left" size="1rem" />
          {{ auth.user ? t('rules.backToGame') : t('rules.backHome') }}
        </button>

        <p class="rules-layout__title">
          <BrandMark size="1.5rem" />
          {{ t('rules.pageTitle') }}
        </p>

        <ThemeToggle class="ml-auto" />

        <button
          type="button"
          class="btn-ghost btn-sm lg:hidden"
          data-testid="rules-sidebar-toggle"
          @click="sidebarOpen = !sidebarOpen"
        >
          <AppIcon name="menu" size="1rem" />
          {{ t('rules.menu') }}
        </button>
      </div>
    </header>

    <div class="mx-auto flex max-w-7xl">
      <aside
        class="rules-layout__sidebar"
        :class="{ 'rules-layout__sidebar--open': sidebarOpen }"
        data-testid="rules-sidebar"
      >
        <div class="rules-layout__sidebar-inner">
          <p class="rules-layout__sidebar-title">{{ t('rules.pageTitle') }}</p>
          <p class="rules-layout__sidebar-lead">{{ t('rules.sidebarLead') }}</p>

          <label class="rules-layout__search">
            <span class="sr-only">{{ t('rules.searchLabel') }}</span>
            <AppIcon name="search" size="0.95rem" class="rules-layout__search-icon" />
            <input
              v-model="navQuery"
              type="search"
              class="rules-layout__search-input"
              :placeholder="t('rules.searchPlaceholder')"
              data-testid="rules-nav-search"
              autocomplete="off"
            />
          </label>

          <nav class="rules-layout__nav" :aria-label="t('rules.pageTitle')">
            <p
              v-if="!filteredNavSections.length"
              class="rules-layout__nav-empty"
              data-testid="rules-nav-empty"
            >
              {{ t('rules.searchEmpty') }}
            </p>

            <div
              v-for="section in filteredNavSections"
              :key="section.id"
              class="rules-layout__nav-group"
            >
              <button
                type="button"
                class="rules-layout__nav-link"
                :class="{
                  'rules-layout__nav-link--active':
                    activeSectionId === section.id || activeParentId === section.id,
                }"
                :data-testid="`rules-nav-${section.id}`"
                @click="scrollToSection(section.id)"
              >
                {{ section.title.replace(/^\d+\.\s*/, '') }}
              </button>

              <div v-if="section.children?.length" class="rules-layout__nav-children">
                <button
                  v-for="child in section.children"
                  :key="child.id"
                  type="button"
                  class="rules-layout__nav-link rules-layout__nav-link--child"
                  :class="{ 'rules-layout__nav-link--active': activeSectionId === child.id }"
                  :data-testid="`rules-nav-${child.id}`"
                  @click="scrollToSection(child.id)"
                >
                  {{ child.title.replace(/^\d+\.\s*/, '') }}
                </button>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <div
        v-if="sidebarOpen"
        class="rules-layout__backdrop lg:hidden"
        @click="sidebarOpen = false"
      />

      <main class="rules-layout__main">
        <article
          ref="contentRef"
          class="rules-doc"
          data-testid="rules-content"
          @click="handleContentClick"
          v-html="html"
        />
      </main>
    </div>

    <SiteFooter tone="paper" />
  </div>
</template>
