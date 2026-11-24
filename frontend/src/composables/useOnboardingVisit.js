import { onMounted } from 'vue';
import { useNotificationsStore } from '../stores/notifications.js';
import { useOnboardingStore } from '../stores/onboarding.js';

/** Enregistre une visite d’écran pour le guide du novice. */
export function useOnboardingVisit(stepKey) {
  const onboarding = useOnboardingStore();
  const notifications = useNotificationsStore();

  // Dès le setup (pas seulement après paint) : un aller-retour rapide
  // hub → collection (overlay anatomie, etc.) ne doit pas rater le POST.
  if (stepKey) void onboarding.recordVisit(stepKey);

  onMounted(async () => {
    if (!stepKey) return;
    await onboarding.recordVisit(stepKey);
    // Le serveur crée éventuellement onboarding_ready ; on rafraîchit l’inbox.
    await notifications.fetchNotifications();
  });
  return onboarding;
}
