<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'

defineOptions({ name: 'ConvertGuestModal' })

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'converted'])

const { t } = useI18n()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const email = ref('')
const senseiName = ref('')
const error = ref(null)
const saving = ref(false)

async function submit() {
  saving.value = true
  error.value = null
  const ok = await auth.convertGuest({
    username: username.value.trim(),
    password: password.value,
    email: email.value.trim() || undefined,
    senseiName: senseiName.value.trim() || undefined,
  })
  saving.value = false
  if (ok) {
    emit('converted')
    emit('close')
  } else {
    error.value = auth.error
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6"
    @click.self="emit('close')"
  >
    <form
      class="w-full max-w-md border border-line bg-bg-card p-8"
      @submit.prevent="submit"
    >
      <h2 class="font-display text-2xl text-ink">{{ t('guest.convertTitle') }}</h2>
      <p class="mt-3 text-sm text-ink-muted">{{ t('guest.convertLead') }}</p>

      <div class="mt-6 space-y-4">
        <label class="block text-sm">
          <span class="text-ink-muted">{{ t('auth.username') }}</span>
          <input v-model="username" type="text" required class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink" />
        </label>
        <label class="block text-sm">
          <span class="text-ink-muted">{{ t('guest.email') }}</span>
          <input v-model="email" type="email" class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink" />
        </label>
        <label class="block text-sm">
          <span class="text-ink-muted">{{ t('auth.senseiName') }}</span>
          <input v-model="senseiName" type="text" class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink" />
        </label>
        <label class="block text-sm">
          <span class="text-ink-muted">{{ t('auth.password') }}</span>
          <input v-model="password" type="password" required minlength="6" class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink" />
        </label>
      </div>

      <p v-if="error" class="mt-4 text-sm text-fire">{{ error }}</p>

      <div class="mt-6 flex gap-3">
        <button type="button" class="btn-ghost flex-1" @click="emit('close')">{{ t('guest.later') }}</button>
        <button type="submit" class="btn-ghost flex-1 border-accent text-accent" :disabled="saving">
          {{ saving ? t('auth.loading') : t('guest.convert') }}
        </button>
      </div>
    </form>
  </div>
</template>
