<script setup>
import AppIcon from '../ui/AppIcon.vue'

defineOptions({ name: 'VerifiedIcon' })

defineProps({
  size: { type: String, default: '1.125rem' },
})
</script>

<template>
  <AppIcon name="verified" :size="size" class="elite-verified-icon" />
</template>

<style scoped>
.elite-verified-icon {
  color: var(--color-gold-fill);
}
</style>
