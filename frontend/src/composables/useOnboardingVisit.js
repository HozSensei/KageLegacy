import { onMounted } from 'vue';
import { useOnboardingStore } from '../stores/onboarding.js';

/** Enregistre une visite d’écran pour le guide du novice. */
export function useOnboardingVisit(stepKey) {
  const onboarding = useOnboardingStore();
  // Dès le setup (pas seulement après paint) : un aller-retour rapide
  // hub → collection (overlay anatomie, etc.) ne doit pas rater le POST.
  if (stepKey) void onboarding.recordVisit(stepKey);
  onMounted(() => {
    if (stepKey) void onboarding.recordVisit(stepKey);
  });
  return onboarding;
}
