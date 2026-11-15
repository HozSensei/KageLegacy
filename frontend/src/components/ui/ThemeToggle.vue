<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import { useTheme } from '../../composables/useTheme.js'

defineOptions({ name: 'ThemeToggle' })

defineProps({
  /** `onFill` : posé sur un aplat indigo (panneaux de la page d'accueil et de connexion). */
  variant: { type: String, default: 'default' },
})

const { t } = useI18n()
const { isDark, toggleTheme } = useTheme()

const label = computed(() => (isDark.value ? t('theme.switchToLight') : t('theme.switchToDark')))
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :class="{ 'theme-toggle--on-fill': variant === 'onFill' }"
    data-testid="theme-toggle"
    :data-theme-current="isDark ? 'dark' : 'light'"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <Transition name="theme-toggle-swap" mode="out-in">
      <AppIcon :key="isDark ? 'sun' : 'moon'" :name="isDark ? 'sun' : 'moon'" size="1.2rem" />
    </Transition>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-ink);
  transition:
    background-color var(--dur-fast) ease,
    color var(--dur-fast) ease,
    border-color var(--dur-fast) ease;
}

.theme-toggle:hover {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.theme-toggle--on-fill {
  border-color: color-mix(in srgb, var(--color-on-fill) 40%, transparent);
  color: var(--color-on-fill);
}

.theme-toggle--on-fill:hover {
  border-color: var(--color-on-fill);
  background: var(--color-on-fill);
  color: var(--color-indigo-deep);
}

.theme-toggle--on-fill:focus-visible {
  outline-color: var(--color-on-fill);
}

.theme-toggle-swap-enter-active,
.theme-toggle-swap-leave-active {
  transition:
    transform var(--dur-fast) var(--ease-out-quint),
    opacity var(--dur-fast) ease;
}

.theme-toggle-swap-enter-from {
  opacity: 0;
  transform: rotate(-45deg) scale(0.7);
}

.theme-toggle-swap-leave-to {
  opacity: 0;
  transform: rotate(45deg) scale(0.7);
}
</style>
