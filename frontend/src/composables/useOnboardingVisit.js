import { onMounted } from 'vue';
import { useOnboardingStore } from '../stores/onboarding.js';

/** Enregistre une visite d’écran pour le guide du novice. */
export function useOnboardingVisit(stepKey) {
  const onboarding = useOnboardingStore();
  onMounted(() => {
    if (stepKey) onboarding.recordVisit(stepKey);
  });
  return onboarding;
}
