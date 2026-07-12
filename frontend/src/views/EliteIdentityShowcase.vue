<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'
import {
  ELITE_BANNERS,
  ELITE_NAME_COLORS,
  ELITE_TITLES,
  SHOWCASE_IDENTITIES,
  mockSenseiIdentity,
} from '../data/eliteCosmeticCatalog.js'

defineOptions({ name: 'EliteIdentityShowcase' })

const { t, locale } = useI18n()

const selectedTitle = ref('shadow_architect')
const selectedBanner = ref('mist')
const selectedColor = ref('#c9a66b')

const titleOptions = computed(() =>
  ELITE_TITLES.map((entry) => ({
    slug: entry.slug,
    label: locale.value === 'en' ? entry.labelEn : entry.labelFr,
  }))
)

const bannerOptions = computed(() =>
  ELITE_BANNERS.map((entry) => ({
    slug: entry.slug,
    label: locale.value === 'en' ? entry.labelEn : entry.labelFr,
  }))
)

const colorOptions = computed(() =>
  ELITE_NAME_COLORS.map((entry) => ({
    hex: entry.hex,
    label: locale.value === 'en' ? entry.labelEn : entry.labelFr,
  }))
)

const livePreview = computed(() => {
  const titleEntry = ELITE_TITLES.find((e) => e.slug === selectedTitle.value)
  return mockSenseiIdentity({
    userId: 999,
    senseiName: 'Votre_Sensei',
    isElite: true,
    titleSlug: selectedTitle.value,
    title: titleEntry
      ? locale.value === 'en'
        ? titleEntry.labelEn
        : titleEntry.labelFr
      : null,
    bannerSlug: selectedBanner.value,
    nameColor: selectedColor.value,
    locale: locale.value,
  })
})
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="elite-identity-showcase">
    <header>
      <p class="page-lead">{{ t('eliteShowcase.lead') }}</p>
      <p class="mt-3 max-w-2xl text-sm text-ink-muted">{{ t('eliteShowcase.hint') }}</p>
    </header>

    <section class="mt-14">
      <p class="section-label">{{ t('eliteShowcase.editorTitle') }}</p>
      <p class="mt-2 text-xs text-ink-faint">{{ t('eliteShowcase.editorHint') }}</p>

      <div class="mt-6 grid gap-8 lg:grid-cols-12">
        <form class="space-y-5 lg:col-span-5" @submit.prevent>
          <label class="block text-xs">
            <span class="text-ink-muted">{{ t('eliteShowcase.fieldTitle') }}</span>
            <select
              v-model="selectedTitle"
              class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="elite-showcase-title"
            >
              <option v-for="opt in titleOptions" :key="opt.slug" :value="opt.slug">
                {{ opt.label }}
              </option>
            </select>
          </label>

          <label class="block text-xs">
            <span class="text-ink-muted">{{ t('eliteShowcase.fieldBanner') }}</span>
            <select
              v-model="selectedBanner"
              class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
              data-testid="elite-showcase-banner"
            >
              <option v-for="opt in bannerOptions" :key="opt.slug" :value="opt.slug">
                {{ opt.label }}
              </option>
            </select>
          </label>

          <fieldset class="text-xs">
            <legend class="text-ink-muted">{{ t('eliteShowcase.fieldColor') }}</legend>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="opt in colorOptions"
                :key="opt.hex"
                type="button"
                class="flex items-center gap-2 border px-2 py-1.5 transition"
                :class="selectedColor === opt.hex ? 'border-accent' : 'border-line'"
                :data-testid="`elite-color-${opt.hex}`"
                @click="selectedColor = opt.hex"
              >
                <span
                  class="inline-block h-4 w-4 rounded-full border border-line"
                  :style="{ backgroundColor: opt.hex }"
                />
                <span class="text-ink-muted">{{ opt.label }}</span>
              </button>
            </div>
          </fieldset>
        </form>

        <div class="lg:col-span-7">
          <SenseiIdentity
            :identity="livePreview"
            variant="card"
            :subtitle="t('eliteShowcase.previewSubtitle')"
            :linkable="false"
          />
        </div>
      </div>
    </section>

    <section class="mt-16">
      <p class="section-label">{{ t('eliteShowcase.variantsTitle') }}</p>

      <div class="mt-8 space-y-12">
        <div>
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">inline</p>
          <div class="mt-3 flex flex-wrap items-center gap-6 border border-line bg-bg-soft p-4">
            <SenseiIdentity :identity="SHOWCASE_IDENTITIES.free" variant="inline" :linkable="false" />
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.eliteMist"
              variant="inline"
              :linkable="false"
              highlight
            />
            <SenseiIdentity :identity="SHOWCASE_IDENTITIES.bot" variant="inline" :linkable="false" />
          </div>
        </div>

        <div>
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">row</p>
          <div class="mt-3 max-w-md space-y-1 border border-line bg-bg-soft p-2">
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.eliteEmbers"
              variant="row"
              subtitle="Division III · 18 pts"
              :linkable="false"
            />
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.eliteMoon"
              variant="row"
              subtitle="Division II · 24 pts"
              :linkable="false"
            />
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.free"
              variant="row"
              subtitle="Division III · 9 pts"
              :linkable="false"
            />
          </div>
        </div>

        <div>
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">match</p>
          <div class="mt-3 flex flex-wrap items-stretch gap-4">
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.eliteMist"
              variant="match"
              subtitle="Domicile"
              :linkable="false"
            />
            <span class="self-center text-sm text-ink-faint">{{ t('common.vs') }}</span>
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.eliteEmbers"
              variant="match"
              subtitle="Extérieur"
              :linkable="false"
            />
          </div>
        </div>

        <div>
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">card</p>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.eliteMist"
              variant="card"
              subtitle="Division III · Saison 3 · 42 réputation"
              :linkable="false"
            />
            <SenseiIdentity
              :identity="SHOWCASE_IDENTITIES.free"
              variant="card"
              subtitle="Division III · Saison 3 · 12 réputation"
              :linkable="false"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="mt-16 border-t border-line pt-10">
      <p class="text-xs text-ink-faint">
        {{ t('eliteShowcase.specRef') }}
        <code class="text-ink-muted">specs/pack-elite.md</code>
      </p>
    </section>
  </div>
</template>
