<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { renderMarkdown } from '../utils/renderMarkdown.js'
import rulesFr from '@docs/regles-du-jeu.md?raw'
import rulesEn from '@docs/game-rules.en.md?raw'

defineOptions({ name: 'RulesView' })

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const html = computed(() => {
  const source = locale.value === 'en' ? rulesEn : rulesFr
  return renderMarkdown(source)
})

function goBack() {
  if (auth.user) {
    router.push('/bureau')
    return
  }
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-bg" data-testid="rules-page">
    <header class="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4 sm:px-10">
        <button
          type="button"
          class="text-[11px] uppercase tracking-[0.14em] text-ink-muted transition hover:text-accent"
          data-testid="rules-back"
          @click="goBack"
        >
          ← {{ auth.user ? t('rules.backToGame') : t('rules.backHome') }}
        </button>
        <p class="ml-auto font-display text-lg text-ink">{{ t('rules.pageTitle') }}</p>
      </div>
    </header>

    <main class="page-shell max-w-4xl">
      <article
        class="rules-doc border border-line bg-bg-card p-6 sm:p-10"
        data-testid="rules-content"
        v-html="html"
      />
    </main>
  </div>
</template>
