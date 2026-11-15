<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from '../cards/CardDisplay.vue'
import BrandMark from '../ui/BrandMark.vue'
import { rarityVisual } from '../../utils/cardVisuals'

defineOptions({ name: 'BoosterOpening' })

const props = defineProps({
  cards: { type: Array, default: () => [] },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const { t, locale } = useI18n()
const revealed = ref([])
const done = ref(false)

const total = computed(() => props.cards.length)

function reset() {
  revealed.value = []
  done.value = false
}

async function runReveal() {
  reset()
  if (!props.active || !props.cards.length) return

  for (let i = 0; i < props.cards.length; i += 1) {
    await new Promise((r) => setTimeout(r, 280 + i * 40))
    revealed.value = [...revealed.value, i]
  }
  done.value = true
  emit('done')
}

onMounted(runReveal)
watch(
  () => [props.active, props.cards],
  () => {
    if (props.active) runReveal()
  }
)

function cardName(entry) {
  const card = entry.card
  return locale.value === 'en' ? card.nameEn : card.nameFr
}
</script>

<template>
  <div class="booster-opening" data-testid="booster-opening" aria-live="polite">
    <p class="booster-opening__status">
      <span class="lozenge" aria-hidden="true" />
      {{
        done
          ? t('shop.revealDone')
          : t('shop.revealing', { n: revealed.length, total })
      }}
    </p>

    <ul class="booster-opening__grid">
      <li
        v-for="(entry, index) in cards"
        :key="`${entry.collectionId}-${index}`"
        class="booster-opening__slot"
        :class="{
          'booster-opening__slot--revealed': revealed.includes(index),
          [`booster-opening__slot--${entry.rarity}`]: true,
        }"
        :data-tone="rarityVisual(entry.rarity).tone"
      >
        <div class="booster-opening__face booster-opening__face--back" aria-hidden="true">
          <BrandMark size="2.75rem" />
          <span>{{ t('shop.sealedScroll') }}</span>
        </div>
        <div class="booster-opening__face booster-opening__face--front">
          <CardDisplay :card="entry.card" :compact="true" />
          <p v-if="entry.isNew" class="booster-opening__new">{{ t('shop.newCard') }}</p>
          <p v-else class="booster-opening__dup">
            {{ t('shop.duplicate', { name: cardName(entry) }) }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.booster-opening__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: var(--type-kicker);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink);
}

.booster-opening__status .lozenge {
  color: var(--color-vermilion);
}

.booster-opening__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.booster-opening__slot {
  display: grid;
  perspective: 900px;
}

.booster-opening__face {
  grid-area: 1 / 1;
  min-width: 0;
  backface-visibility: hidden;
  transition:
    transform 520ms var(--ease-out-quint),
    opacity 300ms ease;
}

.booster-opening__face--back {
  display: flex;
  min-height: 15rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: var(--color-indigo-deep);
  color: var(--color-on-fill);
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  font-stretch: 80%;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.booster-opening__face--front {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  opacity: 0;
  transform: rotateY(180deg);
}

.booster-opening__slot--revealed .booster-opening__face--back {
  opacity: 0;
  pointer-events: none;
  transform: rotateY(-180deg);
}

.booster-opening__slot--revealed .booster-opening__face--front {
  opacity: 1;
  transform: rotateY(0deg);
}

/* Les raretés hautes posent un filet plein sous la carte plutôt qu'un halo. */
.booster-opening__slot--legendary.booster-opening__slot--revealed .booster-opening__face--front,
.booster-opening__slot--mythic.booster-opening__slot--revealed .booster-opening__face--front {
  padding-bottom: 0.4rem;
  border-bottom: 6px solid var(--tone-fill);
}

.booster-opening__new,
.booster-opening__dup {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.booster-opening__new {
  color: var(--color-leaf);
}

.booster-opening__dup {
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--color-ink-muted);
}

@media (prefers-reduced-motion: reduce) {
  .booster-opening__face {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
</style>
