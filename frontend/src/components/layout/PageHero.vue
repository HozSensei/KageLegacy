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
    <div class="page-hero__mural" aria-hidden="true">
      <svg
        class="page-hero__mural-svg"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 480 96"
      >
        <defs>
          <pattern
            id="konoha-mural-pattern"
            width="480"
            height="96"
            patternUnits="userSpaceOnUse"
          >
            <g class="page-hero__mural-tile">
              <ellipse cx="18" cy="78" rx="14" ry="18" />
              <ellipse cx="462" cy="80" rx="12" ry="16" />
              <ellipse cx="248" cy="82" rx="10" ry="14" />
              <path d="M0 96V72l8-6 8 6v24H0z" />
              <path d="M32 96V68l10-8 10 8v28H32z" />
              <path d="M56 96V74l7-5 7 5v22H56z" />
              <path d="M72 96V70l9-7 9 7v26H72z" />
              <path d="M96 96V58l6-10h12l6 10v38H96z" />
              <path d="M94 58h20l-2-4H96l-2 4z" />
              <path d="M98 48h16l-2-4h-12l-2 4z" />
              <path d="M100 40h12l-2-4h-8l-2 4z" />
              <path d="M124 96V76l6-4 6 4v20h-12z" />
              <path d="M140 96V64l8-6 8 6v32h-16z" />
              <path d="M164 96V52c0-8 6-14 14-14s14 6 14 14v44h-28z" />
              <path d="M172 38c0-4 3-6 6-6s6 2 6 6v2h-12v-2z" />
              <path d="M196 96V44h88v52H196z" />
              <path d="M192 44h96l-4-8H196l-4 8z" />
              <path d="M204 44V28h72v16H204z" />
              <path d="M200 28h80l-4-6H204l-4 6z" />
              <path d="M212 28V16h56v12h-56z" />
              <path d="M208 16h64l-3-5h-58l-3 5z" />
              <circle cx="240" cy="34" r="8" fill="none" stroke="currentColor" stroke-width="2.5" />
              <path d="M240 27c-3.5 1.8-5.5 5.2-5.5 8.8 0 2.8 1.8 4.8 5.5 5.5 3.7-.7 5.5-2.7 5.5-5.5 0-3.6-2-7-5.5-8.8z" />
              <rect x="232" y="72" width="16" height="24" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M288 96V60l5-8h10l5 8v36h-20z" />
              <path d="M286 60h20l-2-3h-16l-2 3z" />
              <path d="M290 52h16l-2-3h-12l-2 3z" />
              <path d="M312 96V50l5-9h14l5 9v46h-24z" />
              <path d="M310 50h24l-2-4h-20l-2 4z" />
              <path d="M314 40h20l-2-4h-16l-2 4z" />
              <path d="M318 32h16l-2-4h-12l-2 4z" />
              <path d="M340 96V70l7-5 7 5v26h-14z" />
              <path d="M356 96V74l8-6 8 6v22h-16z" />
              <path d="M380 96V66l9-7 9 7v30h-18z" />
              <path d="M400 96V72l6-4 6 4v24h-12z" />
              <path d="M416 96V68l10-8 10 8v28h-20z" />
              <path d="M440 96V74l7-5 7 5v22h-14z" />
              <path d="M456 96V72l8-6 8 6v24h-16z" />
              <path
                d="M178 42 Q220 28 322 36"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                opacity="0.65"
              />
              <path
                d="M106 36 Q160 22 212 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                opacity="0.5"
              />
              <g opacity="0.9" transform="translate(52 14)">
                <circle r="6.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="M0-4.5c-2.8 1.3-4.5 4-4.5 6.8S-2.8 12.5 0 13s4.5-2 4.5-4.7S2.8-3.2 0-4.5z" />
              </g>
              <g opacity="0.9" transform="translate(408 10)">
                <circle r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M0-3.8c-2.3 1.1-3.8 3.3-3.8 5.8s1.5 4.2 3.8 5 3.8-1.7 3.8-5S2.3-2.7 0-3.8z" />
              </g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#konoha-mural-pattern)" />
      </svg>
    </div>
    <div class="page-hero__overlay" aria-hidden="true" />
    <div class="page-hero__inner">
      <h1 class="page-hero__title">{{ title }}</h1>
    </div>
  </section>
</template>
