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
    class="modal-backdrop"
    @click.self="emit('close')"
  >
    <form class="modal-panel" @submit.prevent="submit">
      <h2 class="t-heading">{{ t('guest.convertTitle') }}</h2>
      <p class="mt-3 text-ink-muted">{{ t('guest.convertLead') }}</p>

      <div class="mt-6 space-y-4">
        <label class="field">
          <span class="field__label">{{ t('auth.username') }}</span>
          <input v-model="username" type="text" required class="input-field" />
        </label>
        <label class="field">
          <span class="field__label">{{ t('guest.email') }}</span>
          <input v-model="email" type="email" class="input-field" />
        </label>
        <label class="field">
          <span class="field__label">{{ t('auth.senseiName') }}</span>
          <input v-model="senseiName" type="text" class="input-field" />
        </label>
        <label class="field">
          <span class="field__label">{{ t('auth.password') }}</span>
          <input v-model="password" type="password" required minlength="6" class="input-field" />
        </label>
      </div>

      <p v-if="error" class="alert alert--error mt-4">{{ error }}</p>

      <div class="mt-6 flex gap-3">
        <button type="button" class="btn-ghost flex-1" @click="emit('close')">{{ t('guest.later') }}</button>
        <button type="submit" class="btn-primary flex-1" :disabled="saving">
          {{ saving ? t('auth.loading') : t('guest.convert') }}
        </button>
      </div>
    </form>
  </div>
</template>
