import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '../stores/notifications.js';
import { useOnboardingStore } from '../stores/onboarding.js';
import { localizedName } from '../utils/localeContent.js';
import { useRewardNotifications } from './useRewardNotifications.js';
import { useToast } from './useToast.js';

/** Enregistre une visite d’écran pour le guide du novice. */
export function useOnboardingVisit(stepKey) {
  const onboarding = useOnboardingStore();
  const notifications = useNotificationsStore();
  const rewardNotifications = useRewardNotifications();
  const toast = useToast();
  const { t, locale } = useI18n();

  // Dès le setup (pas seulement après paint) : un aller-retour rapide
  // hub → collection (overlay anatomie, etc.) ne doit pas rater le POST.
  if (stepKey) void onboarding.recordVisit(stepKey);

  onMounted(async () => {
    if (!stepKey) return;
    const dedupeKey = `onboarding:${stepKey}`;
    const alreadyReady = notifications.items.some(n => n.dedupeKey === dedupeKey);
    await onboarding.recordVisit(stepKey);
    rewardNotifications.syncOnboarding(onboarding.steps || [], {
      labelOf: step => localizedName(step, locale.value, step.key),
      toastNew: false,
    });
    const step = (onboarding.steps || []).find(s => s.key === stepKey);
    if (step?.claimable && !alreadyReady) {
      const label = localizedName(step, locale.value, step.key);
      toast.push({
        title: t('notifications.onboardingReadyTitle'),
        body: t('notifications.onboardingReadyBody', { step: label }),
        kind: 'event',
      });
    }
  });
  return onboarding;
}
