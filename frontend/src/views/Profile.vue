<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '../stores/player'
import PlayerProfile from '../components/player/PlayerProfile.vue'
import LevelUpModal from '../components/player/LevelUpModal.vue'

defineOptions({ name: 'ProfileView' })

const { t } = useI18n()
const router = useRouter()
const player = usePlayerStore()

const showLevelUp = computed(() => Boolean(player.lastLevelUp))

onMounted(async () => {
  await player.fetchPlayer()
  if (!player.character) {
    await router.replace({ name: 'character-creation' })
  }
})

async function onSpecialize(spec) {
  await player.chooseSpecialization(spec)
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="profile-page">
    <p v-if="player.loading && !player.character" class="text-sm text-ink-muted">
      {{ t('common.loading') }}
    </p>
    <p v-else-if="player.error" class="text-sm text-fire" data-testid="profile-error">
      {{ player.error }}
    </p>
    <PlayerProfile
      v-else-if="player.character"
      :character="player.character"
      @specialize="onSpecialize"
    />

    <LevelUpModal
      :open="showLevelUp"
      :levels-gained="player.lastLevelUp?.levelsGained || 1"
      :talent-points-gained="player.lastLevelUp?.talentPointsGained || 1"
      :level="player.lastLevelUp?.level"
      @close="player.clearLevelUp()"
    />
  </div>
</template>
