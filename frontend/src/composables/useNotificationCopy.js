import { useI18n } from 'vue-i18n';
import { villageRewardsHash } from './useVillageRewards.js';

/** Libellés d’affichage pour l’inbox TCG (+ entrée Village). */
export function useNotificationCopy() {
  const { t, locale } = useI18n();

  function title(note) {
    switch (note.kind) {
      case 'quest_ready':
        return t('notifications.questReadyTitle');
      case 'onboarding_ready':
        return t('notifications.onboardingReadyTitle');
      case 'village_ready':
        return t('notifications.villageReadyTitle');
      case 'gain': {
        const source = note.payload?.source;
        if (source === 'onboarding') return t('notifications.gainOnboardingTitle');
        if (source === 'battle_pass') return t('notifications.gainBattlePassTitle');
        if (source === 'quest') return t('notifications.gainQuestTitle');
        if (source === 'achievement') return t('notifications.gainAchievementTitle');
        if (source === 'mission') return t('notifications.gainMissionTitle');
        if (source === 'coop') return t('notifications.gainCoopTitle');
        if (source === 'combat') return t('notifications.gainCombatTitle');
        if (source === 'duel') return t('notifications.gainDuelTitle');
        return t('notifications.gainTitle');
      }
      default:
        return t('notifications.genericTitle');
    }
  }

  function body(note) {
    const p = note.payload || {};
    switch (note.kind) {
      case 'quest_ready': {
        const description =
          (String(locale.value || '').startsWith('en') ? p.descriptionEn : p.description) ||
          p.description ||
          '—';
        return t('notifications.questReadyBody', { description });
      }
      case 'onboarding_ready': {
        const stepLabel =
          (String(locale.value || '').startsWith('en') ? p.labelEn : p.label) ||
          p.label ||
          p.stepKey ||
          '—';
        return t('notifications.onboardingReadyBody', { step: stepLabel });
      }
      case 'village_ready':
        return t('notifications.villageReadyBody', p.count || 1);
      case 'gain':
        return p.body || t('notifications.noRewards');
      default:
        return t('notifications.genericBody');
    }
  }

  function linkPath(note) {
    if (note.href) return note.href;
    if (note.kind === 'quest_ready') return { name: 'battle-pass' };
    if (note.kind === 'onboarding_ready') return { name: 'hub' };
    if (note.kind === 'village_ready') return { name: 'village', hash: villageRewardsHash };
    return null;
  }

  function linkLabel(note) {
    switch (note.kind) {
      case 'quest_ready':
        return t('notifications.questReadyLink');
      case 'onboarding_ready':
        return t('notifications.onboardingReadyLink');
      case 'village_ready':
        return t('notifications.villageReadyLink');
      case 'gain': {
        const source = note.payload?.source;
        if (source === 'quest' || source === 'battle_pass') return t('notifications.viewBattlePass');
        if (source === 'onboarding') return t('notifications.viewHome');
        if (source === 'achievement') return t('notifications.viewJournal');
        if (source === 'mission' || source === 'combat') return t('notifications.viewMissions');
        if (source === 'duel') return t('notifications.viewDuels');
        if (source === 'coop') return t('notifications.viewCoop');
        return null;
      }
      default:
        return null;
    }
  }

  return { title, body, linkPath, linkLabel };
}
