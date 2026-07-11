<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import SlidePanel from './SlidePanel.vue'
import VerifiedIcon from '../icons/VerifiedIcon.vue'

defineOptions({ name: 'AppNavDrawer' })

defineProps({
  navItems: { type: Array, required: true },
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
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-ink-muted transition hover:border-accent/40 hover:text-accent"
    :aria-label="t('nav.menu')"
    :aria-expanded="open"
    data-testid="nav-menu-button"
    @click="toggle"
  >
    <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
  </button>

  <SlidePanel
    v-model="open"
    side="left"
    :aria-label="t('nav.menu')"
    panel-test-id="nav-menu-panel"
  >
    <div class="border-b border-line px-5 py-4">
      <p class="font-display text-lg text-ink">{{ t('nav.menu') }}</p>
    </div>

    <nav class="app-nav-drawer__nav" :aria-label="t('nav.menu')">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="app-nav-drawer__link"
        :class="{ 'app-nav-drawer__link--active': isActive(item.path) }"
        :data-testid="`nav-${item.name}`"
        @click="close"
      >
        {{ t(item.label) }}
        <VerifiedIcon v-if="item.elite" size="0.875rem" />
      </router-link>
    </nav>
  </SlidePanel>
</template>
