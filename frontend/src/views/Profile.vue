<script setup>
import { onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePlayerStore } from '../stores/player';
import PlayerProfile from '../components/player/PlayerProfile.vue';

import PageHeader from '../components/ui/PageHeader.vue';
import forestImage from '../assets/illustrations/forest-path.webp';

defineOptions({ name: 'ProfileView' });

const { t } = useI18n();
const router = useRouter();
const player = usePlayerStore();

onMounted(async () => {
  await player.fetchPlayer();
  if (player.hasConfirmedCharacterAbsence) {
    await router.replace({ name: 'character-creation' });
  }
});
</script>

<template>
  <div class="page-shell" data-testid="profile-page">
    <PageHeader
      tone="vermilion"
      :kicker="t('player.profileKicker')"
      :title="t('player.profileTitle')"
      :lead="t('player.profileLead')"
      :image="forestImage"
      image-position="50% 35%"
    >
      <template v-if="player.character" #actions>
        <RouterLink to="/talents" class="btn-primary" data-testid="profile-header-talents">
          {{ t('talents.openFromProfile') }}
        </RouterLink>
        <RouterLink to="/decks" class="btn-ghost">
          {{ t('player.openDecks') }}
        </RouterLink>
      </template>
    </PageHeader>

    <p v-if="player.loading && !player.character" class="mt-8 text-ink-muted">
      {{ t('common.loading') }}
    </p>
    <p v-if="player.error" class="alert alert--error mt-6" data-testid="profile-error">
      {{ player.error }}
    </p>
    <PlayerProfile
      v-if="player.character"
      :key="player.character.id"
      class="mt-8"
      :character="player.character"
    />
  </div>
</template>
