<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';
import { writeStoredLocale } from '../../utils/localeStorage.js';
import SlidePanel from './SlidePanel.vue';

import AppIcon from '../ui/AppIcon.vue';

defineOptions({ name: 'ProfileMenu' });

const emit = defineEmits(['logout', 'convert', 'deleted']);

const { t, locale } = useI18n();
const auth = useAuthStore();

const open = ref(false);
const section = ref(null);

const currentPassword = ref('');
const newPassword = ref('');
const email = ref('');
const deletePassword = ref('');
const deleteConfirmed = ref(false);
const formError = ref(null);
const saving = ref(false);

const displayName = computed(() => auth.profile?.displayName || auth.user?.email || '');
const isGuest = computed(() => Boolean(auth.user?.isGuest));
const hasPassword = computed(() => Boolean(auth.user?.hasPassword));

watch(open, isOpen => {
  if (isOpen) {
    email.value = auth.user?.email || '';
    section.value = null;
    formError.value = null;
    currentPassword.value = '';
    newPassword.value = '';
    deletePassword.value = '';
    deleteConfirmed.value = false;
  }
});

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function toggleSection(name) {
  if (name == null) {
    section.value = null;
    formError.value = null;
    return;
  }
  section.value = section.value === name ? null : name;
  formError.value = null;
}

async function setLanguage(lang) {
  if (locale.value === lang) {
    close();
    return;
  }
  const previous = locale.value === 'en' ? 'en' : 'fr';
  // Optimistic UI + storage so the chrome updates before the PATCH settles
  locale.value = lang;
  writeStoredLocale(lang);
  const ok = await auth.updateLanguage(lang);
  if (ok) {
    if (auth.profile) auth.profile.language = lang;
    close();
  } else {
    locale.value = previous;
    writeStoredLocale(previous);
    formError.value = auth.error;
  }
}

async function submitEmail() {
  saving.value = true;
  formError.value = null;
  const ok = await auth.updateEmail(email.value);
  saving.value = false;
  if (ok) section.value = null;
  else formError.value = auth.error;
}

async function submitPassword() {
  saving.value = true;
  formError.value = null;
  const ok = await auth.changePassword(currentPassword.value, newPassword.value);
  saving.value = false;
  if (ok) {
    currentPassword.value = '';
    newPassword.value = '';
    section.value = null;
  } else {
    formError.value = auth.error;
  }
}

async function submitDelete() {
  if (!deleteConfirmed.value) {
    formError.value = t('profile.deleteConfirmLabel');
    return;
  }
  saving.value = true;
  formError.value = null;
  const ok = await auth.deleteAccount(hasPassword.value ? deletePassword.value : undefined);
  saving.value = false;
  if (ok) {
    close();
    emit('deleted');
  } else {
    formError.value = auth.error;
  }
}

function handleLogout() {
  close();
  emit('logout');
}

function handleConvert() {
  close();
  emit('convert');
}
</script>

<template>
  <div>
    <button
      type="button"
      class="btn-icon profile-trigger"
      :aria-label="t('profile.menu')"
      :aria-expanded="open"
      data-testid="profile-menu-button"
      @click="toggle"
    >
      <AppIcon name="profile" size="1.25rem" />
    </button>

    <SlidePanel
      v-model="open"
      side="right"
      wide
      :aria-label="t('profile.menu')"
      panel-test-id="profile-menu-panel"
    >
      <div class="profile-menu__head">
        <span class="profile-menu__initial" aria-hidden="true">{{
          displayName.charAt(0).toUpperCase()
        }}</span>
        <div class="min-w-0 flex-1">
          <p class="profile-menu__name">{{ displayName }}</p>

          <p v-if="auth.user?.email" class="mt-0.5 truncate text-xs text-ink-muted">
            {{ auth.user.email }}
          </p>
        </div>
        <button type="button" class="btn-icon" :aria-label="t('common.dismiss')" @click="close">
          <AppIcon name="close" size="1.125rem" :stroke-width="2" />
        </button>
      </div>

      <div class="profile-menu__section">
        <p class="t-kicker">{{ t('profile.language') }}</p>
        <div class="mt-2.5 flex gap-1.5">
          <button
            type="button"
            class="chip"
            data-testid="profile-locale-fr"
            :aria-pressed="locale === 'fr'"
            @click="setLanguage('fr')"
          >
            {{ t('locale.fr') }}
          </button>
          <button
            type="button"
            class="chip"
            data-testid="profile-locale-en"
            :aria-pressed="locale === 'en'"
            @click="setLanguage('en')"
          >
            {{ t('locale.en') }}
          </button>
        </div>
      </div>

      <div class="profile-menu__section flex flex-col gap-2">
        <router-link
          to="/profil"
          class="btn-ghost btn-block"
          data-testid="profile-player-link"
          @click="close"
        >
          {{ t('nav.profile') }}
        </router-link>

        <router-link
          to="/rules"
          class="btn-ghost btn-block"
          data-testid="profile-rules-link"
          @click="close"
        >
          {{ t('rules.link') }}
        </router-link>

        <router-link
          to="/legal"
          class="btn-ghost btn-block"
          data-testid="profile-legal-link"
          @click="close"
        >
          {{ t('footer.legalShort') }}
        </router-link>
      </div>

      <div class="profile-menu__rows">
        <button
          type="button"
          class="profile-menu__row"
          data-testid="profile-change-email"
          @click="toggleSection('email')"
        >
          {{ t('profile.changeEmail') }}
        </button>

        <form v-if="section === 'email'" class="profile-menu__form" @submit.prevent="submitEmail">
          <label class="field">
            <span class="field__label">{{ t('profile.email') }}</span>
            <input
              v-model="email"
              type="email"
              class="input-field"
              data-testid="profile-email-input"
            />
          </label>
          <button
            type="submit"
            class="btn-secondary btn-block"
            :disabled="saving"
            data-testid="profile-email-submit"
          >
            {{ saving ? t('auth.loading') : t('profile.save') }}
          </button>
        </form>

        <button
          v-if="hasPassword"
          type="button"
          class="profile-menu__row"
          data-testid="profile-change-password"
          @click="toggleSection('password')"
        >
          {{ t('profile.changePassword') }}
        </button>

        <form
          v-if="section === 'password' && hasPassword"
          class="profile-menu__form"
          @submit.prevent="submitPassword"
        >
          <label class="field">
            <span class="field__label">{{ t('profile.currentPassword') }}</span>
            <input
              v-model="currentPassword"
              type="password"
              required
              class="input-field"
              data-testid="profile-current-password"
            />
          </label>
          <label class="field">
            <span class="field__label">{{ t('profile.newPassword') }}</span>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              class="input-field"
              data-testid="profile-new-password"
            />
          </label>
          <button
            type="submit"
            class="btn-secondary btn-block"
            :disabled="saving"
            data-testid="profile-password-submit"
          >
            {{ saving ? t('auth.loading') : t('profile.save') }}
          </button>
        </form>

        <button
          v-if="isGuest"
          type="button"
          class="profile-menu__row profile-menu__row--accent"
          data-testid="profile-convert"
          @click="handleConvert"
        >
          {{ t('guest.convertCta') }}
        </button>

        <button
          type="button"
          class="profile-menu__row profile-menu__row--danger"
          data-testid="profile-delete-account"
          @click="toggleSection('delete')"
        >
          {{ t('profile.deleteAccount') }}
        </button>

        <div v-if="section === 'delete'" class="profile-menu__form">
          <p class="text-sm leading-relaxed text-ink-muted">{{ t('profile.deleteWarning') }}</p>
          <label v-if="hasPassword" class="field">
            <span class="field__label">{{ t('profile.deletePassword') }}</span>
            <input
              v-model="deletePassword"
              type="password"
              required
              class="input-field"
              data-testid="profile-delete-password"
            />
          </label>
          <label class="flex items-start gap-2 text-sm text-ink-muted">
            <input
              v-model="deleteConfirmed"
              type="checkbox"
              class="mt-0.5"
              data-testid="profile-delete-confirm"
            />
            <span>{{ t('profile.deleteConfirmLabel') }}</span>
          </label>
          <div class="flex gap-2">
            <button type="button" class="btn-ghost flex-1" @click="toggleSection(null)">
              {{ t('profile.deleteCancel') }}
            </button>
            <button
              type="button"
              class="btn-danger flex-1"
              :disabled="saving || !deleteConfirmed"
              data-testid="profile-delete-submit"
              @click="submitDelete"
            >
              {{ saving ? t('auth.loading') : t('profile.deleteSubmit') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="formError" class="alert alert--error mx-5 mt-3">{{ formError }}</p>

      <button
        type="button"
        class="profile-menu__logout"
        data-testid="profile-logout"
        @click="handleLogout"
      >
        {{ t('auth.logout') }}
        <AppIcon name="arrow-right" size="1rem" :stroke-width="2" />
      </button>
    </SlidePanel>
  </div>
</template>

<style scoped>
.profile-trigger {
  border-radius: 50%;
  background: var(--color-indigo-fill);
  color: var(--color-on-fill);
}

.profile-trigger:hover {
  background: var(--color-vermilion);
}

.profile-menu__head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem 1.25rem 1.1rem;
  border-bottom: 1px solid var(--color-line);
}

.profile-menu__initial {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  background: var(--color-vermilion);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  font-stretch: 80%;
  color: var(--color-on-fill);
}

.profile-menu__name {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  font-stretch: 88%;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-menu__section {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--color-line);
}

.profile-menu__rows {
  display: flex;
  flex-direction: column;
}

.profile-menu__row {
  display: flex;
  width: 100%;
  padding: 0.8rem 1.25rem;
  border-bottom: 1px solid var(--color-line);
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  color: var(--color-ink);
  transition: background-color var(--dur-fast) ease;
}

.profile-menu__row:hover {
  background: var(--color-bg-soft);
}

.profile-menu__row--accent {
  font-weight: 600;
  color: var(--color-accent);
}

.profile-menu__row--danger {
  color: var(--color-fire);
}

.profile-menu__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-bg-soft);
}

.profile-menu__logout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
  padding: 1rem 1.25rem;
  background: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-ink);
  transition: background-color var(--dur-fast) ease;
}

.profile-menu__logout:hover {
  background: var(--color-fire-fill);
  color: var(--color-on-fill);
}
</style>
