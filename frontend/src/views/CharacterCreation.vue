<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '../stores/player'

defineOptions({ name: 'CharacterCreationView' })

const { t } = useI18n()
const router = useRouter()
const player = usePlayerStore()

const name = ref('')
const elementAffinity = ref('Katon')
const clanTraitId = ref(null)

const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon']

onMounted(async () => {
  if (!player.checked) await player.fetchPlayer()
  if (player.character) {
    await router.replace({ name: 'profile' })
    return
  }
  await player.fetchClans()
  if (player.clans.length && clanTraitId.value == null) {
    clanTraitId.value = player.clans[0].id
  }
})

async function submit() {
  const created = await player.createCharacter({
    name: name.value.trim(),
    clanTraitId: clanTraitId.value || null,
    elementAffinity: elementAffinity.value,
  })
  if (created) await router.push({ name: 'hub' })
}
</script>

<template>
  <div class="page-shell" data-testid="character-creation">
    <p class="page-kicker">{{ t('app.name') }}</p>
    <h1 class="page-title mt-3">{{ t('player.createTitle') }}</h1>
    <p class="page-lead">{{ t('player.createLead') }}</p>

    <p v-if="player.error" class="mt-6 text-sm text-fire" data-testid="create-error">
      {{ player.error }}
    </p>

    <form class="mt-10 max-w-lg space-y-6" @submit.prevent="submit">
      <label class="block text-sm">
        <span class="text-ink-muted">{{ t('player.nameLabel') }}</span>
        <input
          v-model="name"
          type="text"
          required
          minlength="2"
          maxlength="100"
          data-testid="create-name"
          class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>

      <fieldset>
        <legend class="text-sm text-ink-muted">{{ t('player.elementLabel') }}</legend>
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label
            v-for="el in ELEMENTS"
            :key="el"
            class="flex cursor-pointer items-center gap-2 border border-line px-3 py-2 text-sm transition"
            :class="elementAffinity === el ? 'border-accent text-accent' : 'text-ink hover:border-accent/50'"
          >
            <input v-model="elementAffinity" type="radio" class="sr-only" :value="el" />
            {{ t(`player.elements.${el}`) }}
          </label>
        </div>
      </fieldset>

      <label v-if="player.clans.length" class="block text-sm">
        <span class="text-ink-muted">{{ t('player.clanLabel') }}</span>
        <select
          v-model="clanTraitId"
          data-testid="create-clan"
          class="mt-1.5 w-full border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
        >
          <option v-for="clan in player.clans" :key="clan.id" :value="clan.id">
            {{ clan.name }}
          </option>
        </select>
      </label>

      <p class="border-l-2 border-line pl-4 text-xs leading-5 text-ink-faint">
        {{ t('player.createHint') }}
      </p>

      <button
        type="submit"
        class="border border-accent bg-accent/10 px-6 py-2.5 text-[11px] uppercase tracking-[0.14em] text-accent transition hover:bg-accent/20 disabled:opacity-50"
        :disabled="player.loading || name.trim().length < 2"
        data-testid="create-submit"
      >
        {{ player.loading ? t('common.loading') : t('player.createSubmit') }}
      </button>
    </form>
  </div>
</template>
