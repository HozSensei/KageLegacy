<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const router = useRouter()
const store = useSquadStore()
const dismissingId = ref(null)

const marketNotes = computed(() =>
  (store.notifications || []).filter((n) => n.kind === 'market_sale')
)

async function dismiss(id) {
  dismissingId.value = id
  try {
    await store.dismissNotification(id)
  } finally {
    dismissingId.value = null
  }
}
</script>

<template>
  <section v-if="marketNotes.length" class="mt-10 space-y-4">
    <article
      v-for="note in marketNotes"
      :key="note.id"
      class="border-l-2 border-accent bg-accent/5 p-5"
    >
      <p class="section-label text-accent">{{ t('bureau.market.saleTitle') }}</p>
      <p class="mt-3 text-sm text-ink">
        {{
          t('bureau.market.saleBody', {
            asset: note.payload.assetLabel,
            buyer: note.payload.buyerName,
            price: note.payload.price.toLocaleString(),
            proceeds: note.payload.sellerProceeds.toLocaleString(),
          })
        }}
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="btn-ghost text-[10px]"
          @click="router.push('/exchanges')"
        >
          {{ t('bureau.market.viewExchanges') }}
        </button>
        <button
          type="button"
          class="btn-ghost text-[10px]"
          :disabled="dismissingId === note.id"
          @click="dismiss(note.id)"
        >
          {{ t('bureau.market.dismiss') }}
        </button>
      </div>
    </article>
  </section>
</template>
