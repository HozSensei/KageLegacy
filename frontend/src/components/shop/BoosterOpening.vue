<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CardDisplay from '../cards/CardDisplay.vue'

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
  if (!props.active || !props.value.length) return

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
      >
        <div class="booster-opening__face booster-opening__face--back" aria-hidden="true">
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
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 1rem;
}

.booster-opening__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.booster-opening__slot {
  position: relative;
  min-height: 210px;
  perspective: 900px;
}

.booster-opening__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  transition: transform 0.55s ease, opacity 0.55s ease;
}

.booster-opening__face--back {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--kl-accent) 35%, transparent);
  background:
    linear-gradient(145deg, var(--kl-bg-card), var(--kl-bg-soft)),
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--kl-accent) 18%, transparent), transparent 60%);
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--color-accent);
  transform: rotateY(0deg);
}

.booster-opening__face--front {
  transform: rotateY(180deg);
  opacity: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.booster-opening__slot--revealed .booster-opening__face--back {
  transform: rotateY(180deg);
  opacity: 0;
  pointer-events: none;
}

.booster-opening__slot--revealed .booster-opening__face--front {
  transform: rotateY(0deg);
  opacity: 1;
  animation: card-pop 0.45s ease;
}

.booster-opening__new {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-win);
}

.booster-opening__dup {
  font-size: 0.7rem;
  color: var(--color-ink-faint);
}

.booster-opening__slot--legendary.booster-opening__slot--revealed .booster-opening__face--front,
.booster-opening__slot--mythic.booster-opening__slot--revealed .booster-opening__face--front {
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--kl-accent) 35%, transparent));
}

@keyframes card-pop {
  from {
    transform: rotateY(0deg) scale(0.92);
  }
  to {
    transform: rotateY(0deg) scale(1);
  }
}
</style>
