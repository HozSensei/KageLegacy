<script setup>
import { useI18n } from 'vue-i18n'
import HeaderWallet from './HeaderWallet.vue'
import AppIcon from '../ui/AppIcon.vue'
import BrandMark from '../ui/BrandMark.vue'
import ThemeToggle from '../ui/ThemeToggle.vue'
import { sectionOf } from '../../constants/sections'

defineOptions({ name: 'AppNavRail' })

defineProps({
  navGroups: { type: Array, required: true },
  isActive: { type: Function, required: true },
})

const { t } = useI18n()
</script>

<template>
  <nav class="nav-rail" :aria-label="t('nav.menu')">
    <router-link to="/home" class="nav-rail__brand" :aria-label="t('app.name')">
      <BrandMark size="1.75rem" />
    </router-link>

    <div class="nav-rail__groups">
      <div v-for="group in navGroups" :key="group.id" class="nav-rail__group">
        <router-link
          v-for="item in group.items"
          :key="item.name"
          :to="item.path"
          class="nav-rail__link"
          :class="{ 'nav-rail__link--active': isActive(item.path) }"
          :aria-label="t(item.label)"
          :aria-current="isActive(item.path) ? 'page' : undefined"
        >
          <AppIcon :name="sectionOf(item.name).icon" size="1.25rem" />
          <span class="nav-rail__flag" aria-hidden="true">
            <span class="nav-rail__flag-index">{{ sectionOf(item.name).index }}</span>
            {{ t(item.label) }}
          </span>
        </router-link>
      </div>
    </div>

    <div class="nav-rail__footer">
      <HeaderWallet variant="rail" />
      <ThemeToggle variant="onFill" />
    </div>

    <p class="nav-rail__vertical t-vertical" aria-hidden="true">{{ t('app.name') }}</p>
  </nav>
</template>

<style scoped>
.nav-rail {
  position: fixed;
  inset-block: 0;
  left: 0;
  z-index: 35;
  display: none;
  flex-direction: column;
  align-items: center;
  width: var(--shell-rail);
  padding: 0.85rem 0 1.25rem;
  overflow: hidden;
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
}

@media (min-width: 1024px) {
  .nav-rail {
    display: flex;
  }
}

.nav-rail__brand {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--color-on-fill);
  transition: transform var(--dur-base) var(--ease-out-quint);
}

.nav-rail__brand:hover {
  transform: rotate(90deg);
}

.nav-rail__groups {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
  margin-top: 1.1rem;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
}

.nav-rail__group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-top: 0.6rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-fill) 18%, transparent);
}

.nav-rail__link {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.5rem;
  border-radius: var(--radius-sm);
  color: color-mix(in srgb, var(--color-on-fill) 78%, transparent);
  transition:
    background-color var(--dur-fast) ease,
    color var(--dur-fast) ease;
}

.nav-rail__link:hover,
.nav-rail__link:focus-visible {
  background: color-mix(in srgb, var(--color-on-fill) 12%, transparent);
  color: var(--color-on-fill);
}

.nav-rail__link:focus-visible,
.nav-rail__brand:focus-visible {
  outline-color: var(--color-on-fill);
}

.nav-rail__link--active,
.nav-rail__link--active:hover {
  background: var(--color-vermilion);
  color: var(--color-on-fill);
}

/* Étiquette qui se déploie au survol */
.nav-rail__flag {
  position: absolute;
  left: calc(100% + 0.65rem);
  top: 50%;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-ink);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--color-on-ink);
  opacity: 0;
  pointer-events: none;
  transform: translate(-6px, -50%);
  transition:
    opacity var(--dur-fast) ease,
    transform var(--dur-fast) var(--ease-out-quint);
}

.nav-rail__flag-index {
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  color: var(--color-gold-fill);
}

.nav-rail__link:hover .nav-rail__flag,
.nav-rail__link:focus-visible .nav-rail__flag {
  opacity: 1;
  transform: translate(0, -50%);
}

.nav-rail__footer {
  display: grid;
  flex-shrink: 0;
  justify-items: center;
  gap: 0.55rem;
  width: 100%;
  margin-top: auto;
  padding: 0.75rem 0 0.35rem;
  border-top: 1px solid color-mix(in srgb, var(--color-on-fill) 18%, transparent);
}

.nav-rail__vertical {
  flex-shrink: 0;
  margin-top: 0.75rem;
  color: color-mix(in srgb, var(--color-on-fill) 62%, transparent);
}

/* À 720 px (Cypress / laptop) le wallet + thème doivent rester dans le viewport. */
@media (max-height: 760px) {
  .nav-rail__vertical {
    display: none;
  }
}
</style>
