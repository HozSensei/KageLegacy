<script setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'AppBottomNav' })

defineProps({
  items: { type: Array, required: true },
  isActive: { type: Function, required: true },
})

const { t } = useI18n()
</script>

<template>
  <nav
    class="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md md:hidden"
    :aria-label="t('nav.menu')"
    data-testid="bottom-nav"
  >
    <ul class="mx-auto flex max-w-6xl">
      <li v-for="item in items" :key="item.name" class="flex-1">
        <router-link
          :to="item.path"
          class="app-bottom-nav__link"
          :class="{ 'app-bottom-nav__link--active': isActive(item.path) }"
          :data-testid="`bottom-nav-${item.name}`"
        >
          <span class="app-bottom-nav__label">{{ t(item.label) }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>
