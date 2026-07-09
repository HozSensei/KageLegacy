<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { resolveBannerClass } from '../../data/eliteCosmeticCatalog.js'

defineOptions({ name: 'SenseiIdentity' })

const props = defineProps({
  identity: { type: Object, required: true },
  variant: {
    type: String,
    default: 'inline',
    validator: (v) => ['inline', 'row', 'card', 'match'].includes(v),
  },
  subtitle: { type: String, default: null },
  linkable: { type: Boolean, default: true },
  highlight: { type: Boolean, default: false },
})

const { t } = useI18n()

const isElite = computed(() => Boolean(props.identity?.isElite))
const isBot = computed(() => Boolean(props.identity?.isBot))
const bannerClass = computed(() => resolveBannerClass(props.identity?.bannerSlug))
const hasBanner = computed(() => bannerClass.value.length > 0 && props.variant !== 'inline')

const gradeLabel = computed(() => {
  if (isBot.value) return t('eliteIdentity.grade.bot')
  if (props.identity?.gradeLabel === 'jonin_elite' || isElite.value) {
    return t('eliteIdentity.grade.joninElite')
  }
  return t('eliteIdentity.grade.jonin')
})

const nameStyle = computed(() => {
  if (!isElite.value) return undefined
  return { color: props.identity?.nameColor || undefined }
})

const rootClasses = computed(() => [
  'sensei-identity',
  `sensei-identity--${props.variant}`,
  {
    'sensei-identity--elite': isElite.value,
    'sensei-identity--bot': isBot.value,
    'sensei-identity--highlight': props.highlight,
    'sensei-identity--banner': hasBanner.value,
  },
])

const profileTo = computed(() =>
  props.linkable && props.identity?.userId != null
    ? props.identity.profileUrl || `/sensei/${props.identity.userId}`
    : null
)
</script>

<template>
  <component
    :is="profileTo ? RouterLink : 'div'"
    :to="profileTo"
    :class="rootClasses"
    :data-testid="`sensei-identity-${identity.userId}`"
  >
    <div
      v-if="hasBanner"
      class="sensei-identity__banner"
      :class="bannerClass"
      aria-hidden="true"
    />

    <div class="sensei-identity__content">
      <p
        v-if="variant === 'card' || variant === 'match'"
        class="sensei-identity__grade"
      >
        {{ gradeLabel }}
        <span v-if="isElite" class="sensei-identity__elite-mark" :title="t('eliteIdentity.eliteBadge')">
          ◆
        </span>
      </p>

      <div class="sensei-identity__name-row">
        <span class="sensei-identity__name" :style="nameStyle">
          {{ identity.senseiName }}
        </span>

        <span
          v-if="isElite && variant !== 'card' && variant !== 'match'"
          class="sensei-identity__elite-pill"
          :title="t('eliteIdentity.eliteBadge')"
        >
          {{ t('eliteIdentity.eliteShort') }}
        </span>

        <span v-if="isBot" class="sensei-identity__bot">
          {{ t('league.bot') }}
        </span>
      </div>

      <p
        v-if="identity.title && variant !== 'inline'"
        class="sensei-identity__title"
      >
        {{ identity.title }}
      </p>

      <p v-if="subtitle" class="sensei-identity__subtitle">
        {{ subtitle }}
      </p>

      <slot />
    </div>
  </component>
</template>
