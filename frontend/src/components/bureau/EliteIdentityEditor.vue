<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEliteStore } from '../../stores/elite'
import SenseiIdentity from '../sensei/SenseiIdentity.vue'

defineOptions({ name: 'EliteIdentityEditor' })

const { t } = useI18n()
const elite = useEliteStore()
const saving = ref(false)
const localError = ref(null)

const titleSlug = ref(null)
const bannerSlug = ref('none')
const nameColor = ref('#e8ece9')

const titleOptions = computed(() =>
  (elite.catalog?.titles ?? []).filter((opt) => opt.unlocked)
)
const bannerOptions = computed(() =>
  (elite.catalog?.banners ?? []).filter((opt) => opt.unlocked)
)
const colorOptions = computed(() =>
  (elite.catalog?.nameColors ?? []).filter((opt) => opt.unlocked)
)

function syncFromStore() {
  titleSlug.value = elite.equipped?.titleSlug ?? titleOptions.value[0]?.slug ?? null
  bannerSlug.value = elite.equipped?.bannerSlug ?? 'none'
  nameColor.value = elite.equipped?.nameColor ?? '#e8ece9'
}

onMounted(syncFromStore)
watch(() => elite.equipped, syncFromStore)
watch(() => elite.catalog, syncFromStore)

const previewIdentity = computed(() => {
  if (!elite.identity) return null
  const titleEntry = elite.catalog?.titles?.find((e) => e.slug === titleSlug.value)
  return {
    ...elite.identity,
    isElite: true,
    gradeLabel: 'jonin_elite',
    titleSlug: titleSlug.value,
    title: titleEntry?.label ?? null,
    bannerSlug: bannerSlug.value,
    nameColor: nameColor.value,
  }
})

async function save() {
  saving.value = true
  localError.value = null
  try {
    await elite.saveCosmetics({
      titleSlug: titleSlug.value,
      bannerSlug: bannerSlug.value,
      nameColor: nameColor.value,
    })
  } catch (e) {
    localError.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mt-8 border-t border-line pt-8" data-testid="elite-identity-editor">
    <p class="section-label">{{ t('elitePack.identityTitle') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('elitePack.identityHint') }}</p>

    <SenseiIdentity
      v-if="previewIdentity"
      class="mt-4"
      :identity="previewIdentity"
      variant="card"
      :subtitle="t('elitePack.identityPreview')"
      :linkable="false"
    />

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-xs">
        <span class="text-ink-muted">{{ t('eliteShowcase.fieldTitle') }}</span>
        <select
          v-model="titleSlug"
          class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
          data-testid="elite-editor-title"
        >
          <option :value="null">{{ t('elitePack.noTitle') }}</option>
          <option v-for="opt in titleOptions" :key="opt.slug" :value="opt.slug">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <label class="block text-xs">
        <span class="text-ink-muted">{{ t('eliteShowcase.fieldBanner') }}</span>
        <select
          v-model="bannerSlug"
          class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
          data-testid="elite-editor-banner"
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
            class="h-8 w-8 rounded-full border-2 transition"
            :class="nameColor === opt.hex ? 'border-accent' : 'border-line'"
            :style="{ backgroundColor: opt.hex }"
            :title="opt.hex"
            @click="nameColor = opt.hex"
          />
        </div>
      </fieldset>

      <button type="submit" class="btn-ghost w-full text-xs" :disabled="saving" data-testid="elite-editor-save">
        {{ saving ? t('common.loading') : t('elitePack.saveIdentity') }}
      </button>
      <p v-if="localError" class="text-xs text-fire">{{ localError }}</p>
    </form>
  </div>
</template>
