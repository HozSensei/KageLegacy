<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

defineOptions({ name: 'ProfileRedirectView' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  if (!auth.checked) await auth.fetchMe()
  if (auth.user?.id) {
    await router.replace({
      name: 'sensei-profile',
      params: { userId: String(auth.user.id) },
      query: route.query,
    })
    return
  }
  await router.replace({ path: '/' })
})
</script>

<template>
  <p class="page-shell text-sm text-ink-muted">…</p>
</template>
