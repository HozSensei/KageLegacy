<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppIcon from '../components/ui/AppIcon.vue'
import BrandMark from '../components/ui/BrandMark.vue'
import ThemeToggle from '../components/ui/ThemeToggle.vue'
import { renderMarkdown } from '../utils/renderMarkdown.js'
import { addHeadingAnchors, parseRulesNav } from '../utils/parseRulesDoc.js'
import rulesFr from '../content/rules.fr.md?raw'
import rulesEn from '../content/rules.en.md?raw'

defineOptions({ name: 'RulesView' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sidebarOpen = ref(false)
const activeSectionId = ref('')
const contentRef = ref(null)
let observer = null

const markdown = computed(() => (locale.value === 'en' ? rulesEn : rulesFr))

const navSections = computed(() => parseRulesNav(markdown.value))

const html = computed(() => addHeadingAnchors(renderMarkdown(markdown.value)))

function goBack() {
  if (auth.user) {
    router.push('/bureau')
    return
  }
  router.push('/')
}

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  sidebarOpen.value = false
  router.replace({ hash: `#${id}` })
}

function setupObserver() {
  observer?.disconnect()
  const root = contentRef.value
  if (!root) return

  const headings = root.querySelectorAll('h2[id]')
  if (!headings.length) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible[0]?.target?.id) {
        activeSectionId.value = visible[0].target.id
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
  )

  headings.forEach((heading) => observer.observe(heading))
}

function applyRouteHash() {
  const hash = route.hash?.replace(/^#/, '')
  if (!hash) return
  requestAnimationFrame(() => {
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSectionId.value = hash
  })
}

watch(html, () => {
  requestAnimationFrame(() => {
    setupObserver()
    applyRouteHash()
  })
})

watch(() => route.hash, applyRouteHash)

onMounted(() => {
  setupObserver()
  applyRouteHash()
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="rules-layout" data-testid="rules-page">
    <header class="rules-layout__header">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-8">
        <button
          type="button"
          class="btn-ghost btn-sm"
          data-testid="rules-back"
          @click="goBack"
        >
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

          <nav class="rules-layout__nav" :aria-label="t('rules.pageTitle')">
            <button
              v-for="section in navSections"
              :key="section.id"
              type="button"
              class="rules-layout__nav-link"
              :class="{ 'rules-layout__nav-link--active': activeSectionId === section.id }"
              :data-testid="`rules-nav-${section.id}`"
              @click="scrollToSection(section.id)"
            >
              {{ section.title.replace(/^\d+\.\s*/, '') }}
            </button>
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
          v-html="html"
        />
      </main>
    </div>
  </div>
</template>
