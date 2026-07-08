<script setup>
defineOptions({ name: 'PageHero' })

defineProps({
  image: { type: String, required: true },
  title: { type: String, required: true },
})
</script>

<template>
  <section class="page-hero" data-testid="page-hero">
    <img :src="image" alt="" class="page-hero__image" decoding="async" />
    <div class="page-hero__overlay" aria-hidden="true" />
    <div class="page-hero__inner">
      <h1 class="page-hero__title">{{ title }}</h1>
    </div>
  </section>
</template>
