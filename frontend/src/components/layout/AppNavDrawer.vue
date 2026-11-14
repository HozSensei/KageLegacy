<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import SlidePanel from './SlidePanel.vue'
import AppIcon from '../ui/AppIcon.vue'
import BrandMark from '../ui/BrandMark.vue'
import { sectionOf } from '../../constants/sections'

defineOptions({ name: 'AppNavDrawer' })

defineProps({
  navGroups: { type: Array, required: true },
  isActive: { type: Function, required: true },
})

const { t } = useI18n()
const route = useRoute()
const open = ref(false)

watch(() => route.path, () => {
  open.value = false
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}
</script>

<template>
  <button
    type="button"
    class="btn-icon"
    :aria-label="t('nav.menu')"
    :aria-expanded="open"
    data-testid="nav-menu-button"
    @click="toggle"
  >
    <AppIcon name="menu" size="1.375rem" :stroke-width="2" />
  </button>

  <SlidePanel
    v-model="open"
    side="left"
    tone="ink"
    :aria-label="t('nav.menu')"
    panel-test-id="nav-menu-panel"
  >
    <div class="nav-drawer__head">
      <BrandMark size="1.75rem" class="nav-drawer__mark" />
      <div class="min-w-0">
        <p class="nav-drawer__title">{{ t('nav.menu') }}</p>
        <p class="nav-drawer__hint">{{ t('nav.menuHint') }}</p>
      </div>
      <button type="button" class="nav-drawer__close" :aria-label="t('common.dismiss')" @click="close">
        <AppIcon name="close" size="1.25rem" :stroke-width="2" />
      </button>
    </div>

    <nav class="nav-drawer__nav" :aria-label="t('nav.menu')">
      <div v-for="group in navGroups" :key="group.id" class="nav-drawer__group">
        <p class="nav-drawer__group-label">{{ t(group.labelKey) }}</p>
        <router-link
          v-for="item in group.items"
          :key="item.name"
          :to="item.path"
          class="nav-drawer__link"
          :class="{ 'nav-drawer__link--active': isActive(item.path) }"
          :data-testid="`nav-${item.name}`"
          @click="close"
        >
          <span class="nav-drawer__index" aria-hidden="true">{{ sectionOf(item.name).index }}</span>
          <span class="nav-drawer__label">{{ t(item.label) }}</span>
          <AppIcon :name="sectionOf(item.name).icon" size="1.125rem" class="nav-drawer__icon" />
        </router-link>
      </div>
    </nav>
  </SlidePanel>
</template>

<style scoped>
.nav-drawer__head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem 1.25rem 1.1rem;
  border-bottom: 1px solid color-mix(in srgb, #fffdf8 16%, transparent);
}

.nav-drawer__mark {
  color: var(--color-vermilion);
}

.nav-drawer__title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.1;
  color: #fffdf8;
}

.nav-drawer__hint {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: color-mix(in srgb, #fffdf8 70%, transparent);
}

.nav-drawer__close {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  margin-left: auto;
  border-radius: var(--radius-sm);
  color: #fffdf8;
  transition: background-color var(--dur-fast) ease;
}

.nav-drawer__close:hover {
  background: color-mix(in srgb, #fffdf8 14%, transparent);
}

.nav-drawer__close:focus-visible,
.nav-drawer__link:focus-visible {
  outline-color: #fffdf8;
}

.nav-drawer__nav {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem 0.75rem 2rem;
}

.nav-drawer__group {
  display: flex;
  flex-direction: column;
  animation: rise-in 420ms var(--ease-out-quint) both;
}

.nav-drawer__group:nth-child(2) {
  animation-delay: 60ms;
}

.nav-drawer__group:nth-child(3) {
  animation-delay: 120ms;
}

.nav-drawer__group:nth-child(4) {
  animation-delay: 180ms;
}

.nav-drawer__group-label {
  padding: 0 0.6rem 0.5rem;
  font-size: var(--type-kicker);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, #fffdf8 62%, transparent);
}

.nav-drawer__link {
  display: flex;
  align-items: baseline;
  gap: 0.85rem;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-sm);
  color: #fffdf8;
  text-decoration: none;
  transition:
    background-color var(--dur-fast) ease,
    transform var(--dur-fast) var(--ease-out-quint);
}

.nav-drawer__link:hover {
  background: color-mix(in srgb, #fffdf8 10%, transparent);
  transform: translateX(4px);
}

.nav-drawer__link--active {
  background: var(--color-vermilion);
}

.nav-drawer__link--active:hover {
  background: var(--color-vermilion);
}

.nav-drawer__index {
  width: 1.5rem;
  flex: none;
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 700;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, #fffdf8 62%, transparent);
}

.nav-drawer__link--active .nav-drawer__index {
  color: #fffdf8;
}

.nav-drawer__label {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  font-stretch: 84%;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.nav-drawer__icon {
  align-self: center;
  opacity: 0.75;
}
</style>
