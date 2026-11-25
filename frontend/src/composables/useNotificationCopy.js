import { useI18n } from 'vue-i18n';
import { BUG_REPORT_LOCATION_OPTIONS } from '../constants/bugReportLocations.js';
import { formatGrants } from '../utils/formatRewardLines.js';
import { villageRewardsHash } from './useVillageRewards.js';

/** Libellés d’affichage pour l’inbox TCG (+ entrée Village). */
export function useNotificationCopy() {
  const { t, locale } = useI18n();

  function bugLocationLabel(payload = {}) {
    const option = BUG_REPORT_LOCATION_OPTIONS.find(item => item.value === payload.location);
    let label = option ? t(option.labelKey) : payload.location || '—';
    if (payload.location === 'other' && payload.locationOther) {
      label = `${label} (${payload.locationOther})`;
    }
    return label;
  }

  function title(note) {
    switch (note.kind) {
      case 'quest_ready': {
        const questType = note.payload?.questType;
        if (questType === 'daily') return t('notifications.questReadyTitleDaily');
        if (questType === 'weekly') return t('notifications.questReadyTitleWeekly');
        if (questType === 'milestone') return t('notifications.questReadyTitleMilestone');
        return t('notifications.questReadyTitle');
      }
      case 'achievement_ready':
        return t('notifications.achievementReadyTitle');
      case 'onboarding_ready':
        return t('notifications.onboardingReadyTitle');
      case 'village_ready':
      case 'village_reward':
        return t('notifications.villageReadyTitle');
      case 'friend_request':
        return t('notifications.friendRequestTitle');
      case 'bug_report_new':
        return t('notifications.bugReportNewTitle');
      case 'bug_report_reward':
        return t('notifications.bugReportRewardTitle');
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
        if (source === 'shop') return t('notifications.gainShopTitle');
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
      case 'achievement_ready': {
        const en = String(locale.value || '').startsWith('en');
        const name = (en ? p.nameEn : p.name) || p.name || p.achievementKey || '—';
        const description =
          (en ? p.descriptionEn : p.description) || p.description || name;
        return t('notifications.achievementReadyBody', { name, description });
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
      case 'village_reward':
        return t('notifications.villageRewardBody', { n: p.ryos || 0 });
      case 'friend_request':
        return t('notifications.friendRequestBody', {
          name: p.fromName || t('community.unknownPlayer'),
        });
      case 'bug_report_new':
        return t('notifications.bugReportNewBody', {
          location: bugLocationLabel(p),
          preview: p.preview || '—',
        });
      case 'bug_report_reward':
        return t('notifications.bugReportRewardBody', { n: p.ryos || 100 });
      case 'gain': {
        if (p.body) return p.body;
        const grants = Array.isArray(p.grants) ? p.grants : [];
        const rewards =
          formatGrants(grants, t, locale.value) || t('notifications.noRewards');
        const en = String(locale.value || '').startsWith('en');
        const label = (en ? p.labelEn : p.label) || p.label || null;
        if (p.source === 'onboarding' && label) {
          return t('notifications.gainOnboardingBody', { step: label, rewards });
        }
        if (p.source === 'battle_pass' && label) {
          return t('notifications.gainBattlePassBody', { level: label, rewards });
        }
        return rewards;
      }
      default:
        return t('notifications.genericBody');
    }
  }

  function linkPath(note) {
    if (note.href) return note.href;
    if (note.kind === 'quest_ready') return { name: 'battle-pass' };
    if (note.kind === 'achievement_ready') return { name: 'journal' };
    if (note.kind === 'onboarding_ready') return { name: 'hub' };
    if (note.kind === 'village_ready' || note.kind === 'village_reward') {
      return { name: 'village', hash: villageRewardsHash };
    }
    if (note.kind === 'friend_request') return { name: 'village', query: { tab: 'friends' } };
    if (note.kind === 'bug_report_new') return { name: 'admin', query: { tab: 'reports' } };
    if (note.kind === 'bug_report_reward') return { name: 'shop' };
    return null;
  }

  function linkLabel(note) {
    switch (note.kind) {
      case 'quest_ready':
        return t('notifications.questReadyLink');
      case 'achievement_ready':
        return t('notifications.achievementReadyLink');
      case 'onboarding_ready':
        return t('notifications.onboardingReadyLink');
      case 'village_ready':
      case 'village_reward':
        return t('notifications.villageReadyLink');
      case 'friend_request':
        return t('notifications.friendRequestLink');
      case 'bug_report_new':
        return t('notifications.bugReportNewLink');
      case 'bug_report_reward':
        return t('notifications.bugReportRewardLink');
      case 'gain': {
        const source = note.payload?.source;
        if (source === 'quest' || source === 'battle_pass') return t('notifications.viewBattlePass');
        if (source === 'onboarding') return t('notifications.viewHome');
        if (source === 'achievement') return t('notifications.viewJournal');
        if (source === 'mission' || source === 'combat') return t('notifications.viewMissions');
        if (source === 'duel') return t('notifications.viewDuels');
        if (source === 'coop') return t('notifications.viewCoop');
        if (source === 'shop' || note.href === '/inventaire') {
          return t('notifications.viewInventory');
        }
        return null;
      }
      default:
        return null;
    }
  }

  return { title, body, linkPath, linkLabel };
}
