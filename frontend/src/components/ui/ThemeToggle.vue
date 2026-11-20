<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import { THEMES, useTheme } from '../../composables/useTheme.js'

defineOptions({ name: 'ThemeToggle' })

defineProps({
  /** `onFill` : posé sur un aplat indigo (panneaux de la page d'accueil et de connexion). */
  variant: { type: String, default: 'default' },
})

const { t } = useI18n()
const { theme, setTheme } = useTheme()

const open = ref(false)
const rootEl = ref(null)

const THEME_ICONS = {
  light: 'sun',
  dark: 'moon',
  ink: 'burn',
  amber: 'special',
}

const options = computed(() =>
  THEMES.map((id) => ({
    id,
    label: t(`theme.${id}`),
    icon: THEME_ICONS[id],
  })),
)

const triggerLabel = computed(() => t('theme.choose'))
const currentIcon = computed(() => THEME_ICONS[theme.value] || 'moon')

function toggleOpen() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function pick(id) {
  setTheme(id)
  close()
}

function onDocPointer(event) {
  if (!open.value || !rootEl.value) return
  if (!rootEl.value.contains(event.target)) close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    close()
    nextTick(() => rootEl.value?.querySelector('[data-testid="theme-toggle"]')?.focus())
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="rootEl"
    class="theme-picker"
    :class="{ 'theme-picker--on-fill': variant === 'onFill' }"
  >
    <button
      type="button"
      class="theme-toggle"
      data-testid="theme-toggle"
      :data-theme-current="theme"
      :aria-label="triggerLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :title="triggerLabel"
      @click="toggleOpen"
    >
      <Transition name="theme-toggle-swap" mode="out-in">
        <AppIcon :key="currentIcon" :name="currentIcon" size="1.2rem" />
      </Transition>
    </button>

    <div
      v-if="open"
      class="theme-picker__menu"
      role="listbox"
      :aria-label="triggerLabel"
      data-testid="theme-picker-menu"
    >
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="theme-picker__option"
        role="option"
        :aria-selected="theme === option.id"
        :data-testid="`theme-option-${option.id}`"
        @click="pick(option.id)"
      >
        <AppIcon :name="option.icon" size="1rem" />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-picker {
  position: relative;
  flex-shrink: 0;
}

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

.theme-picker--on-fill .theme-toggle {
  border-color: color-mix(in srgb, var(--color-on-fill) 40%, transparent);
  color: var(--color-on-fill);
}

.theme-picker--on-fill .theme-toggle:hover {
  border-color: var(--color-on-fill);
  background: var(--color-on-fill);
  color: var(--color-indigo-deep);
}

.theme-picker--on-fill .theme-toggle:focus-visible {
  outline-color: var(--color-on-fill);
}

.theme-picker__menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 40;
  display: flex;
  min-width: 11.5rem;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.35rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
}

/* Rail / drawer (bord gauche) : ouvrir vers le haut et vers la droite (dans le viewport). */
.theme-picker--on-fill .theme-picker__menu {
  top: auto;
  right: auto;
  bottom: calc(100% + 0.4rem);
  left: 0;
}

.theme-picker__option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  min-height: 2.1rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: left;
  transition:
    background-color var(--dur-fast) ease,
    color var(--dur-fast) ease,
    border-color var(--dur-fast) ease;
}

.theme-picker__option:hover {
  color: var(--color-ink);
  border-color: var(--color-line);
}

.theme-picker__option[aria-selected='true'] {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: var(--color-on-ink);
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
