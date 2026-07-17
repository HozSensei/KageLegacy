<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'PliExchangeBlock' })

const props = defineProps({
  exchange: { type: Object, required: true },
})

const { t, locale } = useI18n()

const pliLabel = computed(() =>
  props.exchange?.pli != null ? t('operation.pliNumber', { n: props.exchange.pli }) : t('operation.pli')
)

const winnerLabel = computed(() => {
  const w = props.exchange?.winner
  if (w === 'left') return props.exchange.left?.senseiName
  if (w === 'right') return props.exchange.right?.senseiName
  return null
})

const hpUnit = computed(() => (locale.value === 'en' ? 'HP' : 'PV'))

function sideClass(side) {
  const winner = props.exchange?.winner
  if (winner === 'draw') return 'pli-exchange__side pli-exchange__side--draw'
  if (winner === side) return 'pli-exchange__side pli-exchange__side--win'
  return 'pli-exchange__side pli-exchange__side--lose'
}
</script>

<template>
  <article class="pli-exchange" data-testid="pli-exchange">
    <header class="pli-exchange__head">
      <span class="pli-exchange__pli">{{ pliLabel }}</span>
      <span v-if="winnerLabel" class="pli-exchange__winner">
        {{ t('operation.pliWonBy', { name: winnerLabel }) }}
      </span>
      <span v-else class="pli-exchange__winner pli-exchange__winner--draw">
        {{ t('operation.pliDraw') }}
      </span>
    </header>

    <div class="pli-exchange__grid">
      <div :class="sideClass('left')" data-testid="pli-side-left">
        <p class="pli-exchange__sensei">{{ exchange.left?.senseiName || '—' }}</p>
        <p class="pli-exchange__actor">{{ exchange.left?.actor || '—' }}</p>
        <p v-if="exchange.left?.cardName" class="pli-exchange__card">
          « {{ exchange.left.cardName }} »
        </p>
        <p class="pli-exchange__domain">{{ exchange.left?.domain || '—' }}</p>
        <p
          v-if="exchange.left?.damageReceivedPv > 0"
          class="pli-exchange__impact pli-exchange__impact--dmg"
        >
          −{{ exchange.left.damageReceivedPv }} {{ hpUnit }}
          <span v-if="exchange.left.hitTarget" class="pli-exchange__target">
            · {{ exchange.left.hitTarget }}
          </span>
        </p>
        <p
          v-if="exchange.left?.healPv > 0"
          class="pli-exchange__impact pli-exchange__impact--heal"
        >
          +{{ exchange.left.healPv }} {{ hpUnit }}
        </p>
      </div>

      <div class="pli-exchange__vs" aria-hidden="true">{{ t('common.vs') }}</div>

      <div :class="sideClass('right')" data-testid="pli-side-right">
        <p class="pli-exchange__sensei">{{ exchange.right?.senseiName || '—' }}</p>
        <p class="pli-exchange__actor">{{ exchange.right?.actor || '—' }}</p>
        <p v-if="exchange.right?.cardName" class="pli-exchange__card">
          « {{ exchange.right.cardName }} »
        </p>
        <p class="pli-exchange__domain">{{ exchange.right?.domain || '—' }}</p>
        <p
          v-if="exchange.right?.damageReceivedPv > 0"
          class="pli-exchange__impact pli-exchange__impact--dmg"
        >
          −{{ exchange.right.damageReceivedPv }} {{ hpUnit }}
          <span v-if="exchange.right.hitTarget" class="pli-exchange__target">
            · {{ exchange.right.hitTarget }}
          </span>
        </p>
        <p
          v-if="exchange.right?.healPv > 0"
          class="pli-exchange__impact pli-exchange__impact--heal"
        >
          +{{ exchange.right.healPv }} {{ hpUnit }}
        </p>
      </div>
    </div>
  </article>
</template>
