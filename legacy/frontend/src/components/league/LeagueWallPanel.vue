<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { readApiError } from '../../utils/http.js'

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const posts = ref([])
const hasMore = ref(false)
const nextBeforeId = ref(null)
const loading = ref(true)
const loadingMore = ref(false)
const posting = ref(false)
const error = ref(null)
const draft = ref('')

async function fetchPage({ append = false } = {}) {
  if (append) loadingMore.value = true
  else loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({ limit: '20' })
    if (append && nextBeforeId.value) params.set('beforeId', String(nextBeforeId.value))
    const res = await fetch(`${API_BASE}/api/league/wall?${params}`)
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    posts.value = append ? [...posts.value, ...data.posts] : data.posts
    hasMore.value = Boolean(data.hasMore)
    nextBeforeId.value = data.nextBeforeId
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function submit() {
  const body = draft.value.trim()
  if (!body || posting.value) return
  posting.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/league/wall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    posts.value = [data.post, ...posts.value]
    draft.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    posting.value = false
  }
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

onMounted(() => fetchPage())
</script>

<template>
  <section class="mt-14" data-testid="league-wall">
    <p class="section-label">{{ t('league.wallTitle') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('league.wallLead') }}</p>

    <form class="mt-6" @submit.prevent="submit">
      <textarea
        v-model="draft"
        rows="2"
        maxlength="280"
        class="w-full border border-line bg-bg-soft px-3 py-2 text-sm text-ink"
        :placeholder="t('league.wallPlaceholder')"
        data-testid="league-wall-input"
      />
      <div class="mt-2 flex items-center justify-between gap-3">
        <span class="text-[10px] text-ink-faint">{{ draft.length }}/280</span>
        <button
          type="submit"
          class="btn-ghost text-[10px]"
          :disabled="posting || !draft.trim()"
          data-testid="league-wall-submit"
        >
          {{ posting ? t('common.loading') : t('league.wallPost') }}
        </button>
      </div>
    </form>

    <p v-if="error" class="mt-3 text-xs text-fire">{{ error }}</p>
    <p v-if="loading" class="mt-6 text-sm text-ink-muted">{{ t('common.loading') }}</p>

    <ul v-else class="mt-6 space-y-4" data-testid="league-wall-list">
      <li
        v-for="post in posts"
        :key="post.id"
        class="border-l border-line pl-4 text-sm"
      >
        <p class="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          <span :class="post.isOwn ? 'text-accent' : 'text-ink-muted'">{{ post.authorName }}</span>
          · {{ formatTime(post.createdAt) }}
        </p>
        <p class="mt-1 text-ink">{{ post.body }}</p>
      </li>
      <li v-if="!posts.length" class="text-sm text-ink-faint">
        {{ t('league.wallEmpty') }}
      </li>
    </ul>

    <button
      v-if="hasMore"
      type="button"
      class="btn-ghost mt-6 text-[10px]"
      :disabled="loadingMore"
      data-testid="league-wall-more"
      @click="fetchPage({ append: true })"
    >
      {{ loadingMore ? t('common.loading') : t('league.wallMore') }}
    </button>
  </section>
</template>
