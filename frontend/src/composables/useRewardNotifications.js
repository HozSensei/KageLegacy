import { useI18n } from 'vue-i18n';

import { useNotificationsStore } from '../stores/notifications.js';
import {
  formatCombatSummary,
  formatGrants,
  normalizeDuelReward,
} from '../utils/formatRewardLines.js';
import { localizedDescription, localizedName } from '../utils/localeContent.js';
import { useToast } from './useToast.js';

function questTypeLabel(questType, t) {
  if (questType === 'daily') return t('battlePass.dailyQuests');
  if (questType === 'weekly') return t('battlePass.weeklyQuests');
  if (questType === 'milestone') return t('battlePass.milestoneQuests');
  return t('battlePass.questsTitle');
}

/**
 * Helpers pour alimenter l’inbox + toasts à partir des gains TCG.
 */
export function useRewardNotifications() {
  const { t, locale } = useI18n();
  const notifications = useNotificationsStore();
  const toast = useToast();

  function toastFromNote(title, body, kind = 'info') {
    toast.push({ title, body, kind });
  }

  function notifyGrants({ source, grants, label, href, toast: withToast = true } = {}) {
    const body = formatGrants(grants, t) || t('notifications.noRewards');
    const title =
      source === 'onboarding'
        ? t('notifications.gainOnboardingTitle')
        : source === 'battle_pass'
          ? t('notifications.gainBattlePassTitle')
          : source === 'quest'
            ? t('notifications.gainQuestTitle')
            : source === 'achievement'
              ? t('notifications.gainAchievementTitle')
              : t('notifications.gainTitle');

    const detail =
      source === 'onboarding' && label
        ? t('notifications.gainOnboardingBody', { step: label, rewards: body })
        : source === 'battle_pass' && label
          ? t('notifications.gainBattlePassBody', { level: label, rewards: body })
          : body;

    notifications.push({
      kind: 'gain',
      payload: { source, grants: grants || [], label: label || null, body: detail },
      href: href ?? null,
    });
    if (withToast) toastFromNote(title, detail);
  }

  function notifyCombatRecap({
    source = 'mission',
    rewards,
    dedupeKey,
    href,
    outcomeLabel = null,
    toast: withToast = true,
  } = {}) {
    const summary = formatCombatSummary(rewards, t);
    if (!summary && !outcomeLabel) return null;

    const title =
      source === 'duel'
        ? t('notifications.gainDuelTitle')
        : source === 'coop'
          ? t('notifications.gainCoopTitle')
          : source === 'combat'
            ? t('notifications.gainCombatTitle')
            : t('notifications.gainMissionTitle');

    const body =
      source === 'duel'
        ? t('notifications.gainDuelBody', {
            outcome: outcomeLabel || t('combat.victory'),
            rewards: summary || t('notifications.noRewards'),
          })
        : summary || t('notifications.noRewards');

    const id = notifications.pushOnce({
      kind: 'gain',
      dedupeKey: dedupeKey || null,
      payload: { source, body, rewards: rewards || null },
      href: href ?? null,
    });
    if (id && withToast) toastFromNote(title, body);
    return id;
  }

  function notifyDuelRecap({ reward, state, duelId, href, toast: withToast = true } = {}) {
    const normalized = normalizeDuelReward(reward);
    const lines = [];
    if (normalized?.ryos > 0) lines.push(t('combat.rewardRyos', { n: normalized.ryos }));
    if (normalized?.xp > 0) lines.push(t('combat.rewardXp', { n: normalized.xp }));
    const summary = lines.join(' · ') || t('notifications.noRewards');

    const outcome =
      state === 'victory'
        ? t('combat.victory')
        : state === 'defeat'
          ? t('combat.defeat')
          : state === 'forfeited'
            ? t('combat.forfeited')
            : t('deckDuels.unknownOutcome');

    const body = t('notifications.gainDuelBody', { outcome, rewards: summary });
    const id = notifications.pushOnce({
      kind: 'gain',
      dedupeKey: duelId != null ? `duel-recap:${duelId}` : null,
      payload: { source: 'duel', body, rewards: normalized },
      href: href ?? { name: 'deck-duels' },
    });
    if (id && withToast) toastFromNote(t('notifications.gainDuelTitle'), body);
    return id;
  }

  function syncQuests(quests, { toastNew = true } = {}) {
    const before = new Set(
      notifications.items.filter(n => n.kind === 'quest_ready').map(n => n.dedupeKey)
    );
    notifications.syncQuestReady(quests, quest => {
      const description =
        localizedDescription(quest, locale.value) || quest.questKey || String(quest.id);
      return {
        payload: {
          questId: quest.id,
          questKey: quest.questKey,
          questType: quest.questType || null,
          description,
          descriptionEn: localizedDescription(quest, 'en') || description,
          xpReward: quest.xpReward || 0,
        },
        href: { name: 'battle-pass' },
      };
    });
    if (!toastNew) return;
    for (const note of notifications.items.filter(n => n.kind === 'quest_ready')) {
      if (before.has(note.dedupeKey)) continue;
      const typeLabel = questTypeLabel(note.payload?.questType, t);
      toastFromNote(
        t('notifications.questReadyTitleTyped', { type: typeLabel }),
        t('notifications.questReadyBody', {
          description: note.payload?.description || '—',
        }),
        'event'
      );
    }
  }

  function syncAchievements(achievements, { toastNew = true } = {}) {
    const before = new Set(
      notifications.items.filter(n => n.kind === 'achievement_ready').map(n => n.dedupeKey)
    );
    notifications.syncAchievementReady(achievements, ({ achievement, tier }) => {
      const name = localizedName(achievement, locale.value, achievement.key);
      const nameEn = localizedName(achievement, 'en', achievement.key);
      const description =
        localizedDescription(tier, locale.value) ||
        localizedDescription(achievement, locale.value) ||
        name;
      return {
        payload: {
          achievementKey: achievement.key,
          tier: tier.tier,
          name,
          nameEn,
          description,
          descriptionEn:
            localizedDescription(tier, 'en') ||
            localizedDescription(achievement, 'en') ||
            nameEn,
        },
        href: { name: 'journal' },
      };
    });
    if (!toastNew) return;
    for (const note of notifications.items.filter(n => n.kind === 'achievement_ready')) {
      if (before.has(note.dedupeKey)) continue;
      toastFromNote(
        t('notifications.achievementReadyTitle'),
        t('notifications.achievementReadyBody', {
          name: note.payload?.name || '—',
          description: note.payload?.description || '—',
        }),
        'event'
      );
    }
  }

  function syncOnboarding(steps, { labelOf, toastNew = true } = {}) {
    const before = new Set(
      notifications.items.filter(n => n.kind === 'onboarding_ready').map(n => n.dedupeKey)
    );
    notifications.syncOnboardingReady(steps, step => {
      const label = labelOf?.(step) || step.nameFr || step.key;
      const labelEn = step.nameEn || label;
      return {
        payload: { stepKey: step.key, label, labelEn },
        href: { name: 'hub' },
      };
    });
    if (!toastNew) return;
    for (const note of notifications.items.filter(n => n.kind === 'onboarding_ready')) {
      if (before.has(note.dedupeKey)) continue;
      toastFromNote(
        t('notifications.onboardingReadyTitle'),
        t('notifications.onboardingReadyBody', {
          step: note.payload?.label || note.payload?.stepKey || '—',
        }),
        'event'
      );
    }
  }

  return {
    notifyGrants,
    notifyCombatRecap,
    notifyDuelRecap,
    syncQuests,
    syncOnboarding,
    syncAchievements,
    dismiss: notifications.dismiss,
    clearDedupe: notifications.clearDedupe,
  };
}
