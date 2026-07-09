<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useSquadStore } from '../../stores/squad'

defineOptions({ name: 'ProfileMenu' })

const emit = defineEmits(['logout', 'convert', 'deleted'])

const { t, locale } = useI18n()
const auth = useAuthStore()
const squad = useSquadStore()

const open = ref(false)
const root = ref(null)
const section = ref(null)

const currentPassword = ref('')
const newPassword = ref('')
const email = ref('')
const deletePassword = ref('')
const deleteConfirmed = ref(false)
const formError = ref(null)
const saving = ref(false)

const displayName = computed(() => auth.sensei?.name || auth.user?.username || '')
const isGuest = computed(() => Boolean(auth.user?.isGuest))

watch(open, (isOpen) => {
  if (isOpen) {
    email.value = auth.user?.email || ''
    section.value = null
    formError.value = null
    currentPassword.value = ''
    newPassword.value = ''
    deletePassword.value = ''
    deleteConfirmed.value = false
  }
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDocumentClick(event) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target)) {
    close()
  }
}

function toggleSection(name) {
  if (name == null) {
    section.value = null
    formError.value = null
    return
  }
  section.value = section.value === name ? null : name
  formError.value = null
}

async function setLanguage(lang) {
  if (locale.value === lang) return
  const ok = await auth.updateLanguage(lang)
  if (ok) {
    locale.value = lang
    if (squad.sensei) squad.sensei.language = lang
  } else {
    formError.value = auth.error
  }
}

async function submitEmail() {
  saving.value = true
  formError.value = null
  const ok = await auth.updateEmail(email.value)
  saving.value = false
  if (ok) section.value = null
  else formError.value = auth.error
}

async function submitPassword() {
  saving.value = true
  formError.value = null
  const ok = await auth.changePassword(currentPassword.value, newPassword.value)
  saving.value = false
  if (ok) {
    currentPassword.value = ''
    newPassword.value = ''
    section.value = null
  } else {
    formError.value = auth.error
  }
}

async function submitDelete() {
  if (!deleteConfirmed.value) {
    formError.value = t('profile.deleteConfirmLabel')
    return
  }
  saving.value = true
  formError.value = null
  const ok = await auth.deleteAccount(isGuest.value ? undefined : deletePassword.value)
  saving.value = false
  if (ok) {
    close()
    emit('deleted')
  } else {
    formError.value = auth.error
  }
}

function handleLogout() {
  close()
  emit('logout')
}

function handleConvert() {
  close()
  emit('convert')
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition hover:border-accent/40 hover:text-accent"
      :aria-label="t('profile.menu')"
      :aria-expanded="open"
      data-testid="profile-menu-button"
      @click.stop="toggle"
    >
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-3rem))] border border-line bg-bg-card shadow-lg"
      role="dialog"
      :aria-label="t('profile.menu')"
      data-testid="profile-menu-panel"
      @click.stop
    >
      <div class="border-b border-line px-4 py-3">
        <p class="truncate text-sm font-medium text-ink">{{ displayName }}</p>
        <p v-if="auth.user?.username && auth.sensei?.name" class="truncate text-xs text-ink-faint">
          {{ auth.user.username }}
        </p>
        <p v-if="auth.user?.email" class="mt-1 truncate text-xs text-ink-muted">{{ auth.user.email }}</p>
      </div>

      <div class="border-b border-line px-4 py-3">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('profile.language') }}</p>
        <div class="mt-2 flex gap-1 text-[11px] uppercase tracking-[0.14em]">
          <button
            type="button"
            class="px-2 py-1 transition"
            data-testid="profile-locale-fr"
            :class="locale === 'fr' ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'"
            @click="setLanguage('fr')"
          >
            {{ t('locale.fr') }}
          </button>
          <span class="text-ink-faint/40">/</span>
          <button
            type="button"
            class="px-2 py-1 transition"
            data-testid="profile-locale-en"
            :class="locale === 'en' ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'"
            @click="setLanguage('en')"
          >
            {{ t('locale.en') }}
          </button>
        </div>
      </div>

      <div class="border-b border-line px-4 py-3">
        <router-link
          to="/rules"
          class="flex w-full px-0 py-0 text-left text-sm text-ink-muted transition hover:text-accent"
          data-testid="profile-rules-link"
          @click="close"
        >
          {{ t('rules.link') }}
        </router-link>
      </div>

      <div class="divide-y divide-line/60">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink-muted transition hover:bg-bg-soft hover:text-ink"
          data-testid="profile-change-email"
          @click="toggleSection('email')"
        >
          {{ t('profile.changeEmail') }}
        </button>

        <form
          v-if="section === 'email'"
          class="space-y-3 border-t border-line/60 bg-bg-soft/50 px-4 py-3"
          @submit.prevent="submitEmail"
        >
          <label class="block text-xs">
            <span class="text-ink-muted">{{ t('profile.email') }}</span>
            <input
              v-model="email"
              type="email"
              class="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="profile-email-input"
            />
          </label>
          <button
            type="submit"
            class="btn-ghost w-full text-xs"
            :disabled="saving"
            data-testid="profile-email-submit"
          >
            {{ saving ? t('auth.loading') : t('profile.save') }}
          </button>
        </form>

        <button
          v-if="!isGuest"
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink-muted transition hover:bg-bg-soft hover:text-ink"
          data-testid="profile-change-password"
          @click="toggleSection('password')"
        >
          {{ t('profile.changePassword') }}
        </button>

        <form
          v-if="section === 'password' && !isGuest"
          class="space-y-3 border-t border-line/60 bg-bg-soft/50 px-4 py-3"
          @submit.prevent="submitPassword"
        >
          <label class="block text-xs">
            <span class="text-ink-muted">{{ t('profile.currentPassword') }}</span>
            <input
              v-model="currentPassword"
              type="password"
              required
              class="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="profile-current-password"
            />
          </label>
          <label class="block text-xs">
            <span class="text-ink-muted">{{ t('profile.newPassword') }}</span>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              class="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="profile-new-password"
            />
          </label>
          <button
            type="submit"
            class="btn-ghost w-full text-xs"
            :disabled="saving"
            data-testid="profile-password-submit"
          >
            {{ saving ? t('auth.loading') : t('profile.save') }}
          </button>
        </form>

        <button
          v-if="isGuest"
          type="button"
          class="flex w-full px-4 py-3 text-left text-sm text-accent transition hover:bg-bg-soft"
          data-testid="profile-convert"
          @click="handleConvert"
        >
          {{ t('guest.convertCta') }}
        </button>

        <button
          type="button"
          class="flex w-full px-4 py-3 text-left text-sm text-fire transition hover:bg-bg-soft"
          data-testid="profile-delete-account"
          @click="toggleSection('delete')"
        >
          {{ t('profile.deleteAccount') }}
        </button>

        <div
          v-if="section === 'delete'"
          class="space-y-3 border-t border-line/60 bg-bg-soft/50 px-4 py-3"
        >
          <p class="text-xs leading-relaxed text-ink-muted">{{ t('profile.deleteWarning') }}</p>
          <label v-if="!isGuest" class="block text-xs">
            <span class="text-ink-muted">{{ t('profile.deletePassword') }}</span>
            <input
              v-model="deletePassword"
              type="password"
              required
              class="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="profile-delete-password"
            />
          </label>
          <label class="flex items-start gap-2 text-xs text-ink-muted">
            <input
              v-model="deleteConfirmed"
              type="checkbox"
              class="mt-0.5"
              data-testid="profile-delete-confirm"
            />
            <span>{{ t('profile.deleteConfirmLabel') }}</span>
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-ghost flex-1 text-xs"
              @click="toggleSection(null)"
            >
              {{ t('profile.deleteCancel') }}
            </button>
            <button
              type="button"
              class="btn-ghost flex-1 border-fire text-fire text-xs"
              :disabled="saving || !deleteConfirmed"
              data-testid="profile-delete-submit"
              @click="submitDelete"
            >
              {{ saving ? t('auth.loading') : t('profile.deleteSubmit') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="formError" class="border-t border-line px-4 py-2 text-xs text-fire">{{ formError }}</p>

      <button
        type="button"
        class="w-full border-t border-line px-4 py-3 text-left text-sm text-ink-muted transition hover:bg-bg-soft hover:text-fire"
        data-testid="profile-logout"
        @click="handleLogout"
      >
        {{ t('auth.logout') }}
      </button>
    </div>
  </div>
</template>
