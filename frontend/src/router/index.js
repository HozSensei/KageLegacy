import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import LandingView from '../views/LandingView.vue';
import LoginView from '../views/LoginView.vue';
import RulesView from '../views/RulesView.vue';
import LegalView from '../views/LegalView.vue';

import HubView from '../views/HubView.vue';
import Profile from '../views/Profile.vue';
import CharacterCreation from '../views/CharacterCreation.vue';
import CollectionView from '../views/CollectionView.vue';
import DeckBuilderView from '../views/DeckBuilderView.vue';
import TalentTreeView from '../views/TalentTreeView.vue';
import MissionsCombatView from '../views/MissionsCombatView.vue';
import MissionRunView from '../views/MissionRunView.vue';
import CombatView from '../views/CombatView.vue';
import CoopView from '../views/CoopView.vue';
import CoopMissionRunView from '../views/CoopMissionRunView.vue';
import ShopView from '../views/ShopView.vue';
import BattlePassView from '../views/BattlePassView.vue';
import JournalView from '../views/JournalView.vue';
import LeaderboardView from '../views/LeaderboardView.vue';
import AdminView from '../views/AdminView.vue';
import BugReportView from '../views/BugReportView.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.meta.combatLayout) return { top: 0 };
    return false;
  },
  routes: [
    { path: '/', name: 'home', component: LandingView },
    { path: '/rules', name: 'rules', component: RulesView },
    { path: '/legal', name: 'legal', component: LegalView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: LoginView },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'home',
          name: 'hub',
          component: HubView,
        },

        {
          path: 'character-creation',
          name: 'character-creation',
          component: CharacterCreation,
        },
        {
          path: 'profil',
          name: 'profile',
          component: Profile,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'collection',
          name: 'collection',
          component: CollectionView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'decks',
          name: 'decks',
          component: DeckBuilderView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'talents',
          name: 'talents',
          component: TalentTreeView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'missions',
          name: 'missions',
          component: MissionsCombatView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'missions/run/:id',
          name: 'mission-run',
          component: MissionRunView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'combat/:id',
          name: 'combat',
          component: CombatView,
          meta: {
            requiresCharacter: true,
            combatLayout: true,
          },
        },
        {
          path: 'coop',
          name: 'coop',
          component: CoopView,
          meta: { requiresCharacter: true },
        },
        {
          path: 'coop/run/:id',
          name: 'coop-run',
          component: CoopMissionRunView,
          meta: { requiresCharacter: true },
        },
        {
          path: 'deck-duels',
          name: 'deck-duels',
          component: () => import('../views/DeckDuelsView.vue'),
          meta: { requiresCharacter: true },
        },
        // Ancienne arène temps réel → duels de decks (PvP async, deck figé côté serveur).
        { path: 'pvp', redirect: { name: 'deck-duels' } },
        { path: 'pvp/duel/:id', redirect: { name: 'deck-duels' } },
        {
          path: 'village',
          name: 'village',
          component: () => import('../views/CommunityView.vue'),
          meta: { requiresCharacter: true },
        },
        { path: 'community', redirect: { name: 'village' } },
        {
          path: 'shop',
          name: 'shop',
          component: ShopView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'battle-pass',
          name: 'battle-pass',
          component: BattlePassView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'journal',
          name: 'journal',
          component: JournalView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'classement',
          name: 'leaderboard',
          component: LeaderboardView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'admin',
          name: 'admin',
          component: AdminView,
          meta: { requiresAdmin: true },
        },
        {
          path: 'bug-report',
          name: 'bug-report',
          component: BugReportView,
        },
      ],
    },
  ],
});

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/rules', '/legal']);

router.beforeEach(async to => {
  const auth = useAuthStore();

  if (PUBLIC_PATHS.has(to.path)) {
    if (!auth.checked) await auth.fetchMe();
    if (auth.user && (to.path === '/' || to.path === '/login' || to.path === '/register')) {
      return { path: '/home' };
    }
    return true;
  }

  if (!auth.checked) await auth.fetchMe();
  if (!auth.user) return { path: '/' };
  if (to.meta.requiresAdmin && !auth.user.isAdmin) return { path: '/home' };

  // Sans personnage : uniquement le wizard de création (et l'admin).
  const allowWithoutCharacter = new Set(['character-creation', 'admin', 'bug-report']);
  if (!allowWithoutCharacter.has(to.name)) {
    const { usePlayerStore } = await import('../stores/player');
    const player = usePlayerStore();
    // Revalider si pas encore chargé, ou si l'absence est mémorisée (perso créé dans un
    // autre onglet / après un wizard) — sinon le garde bloque à tort la nav SPA.
    if (!player.checked || player.hasConfirmedCharacterAbsence) {
      await player.fetchPlayer();
    }
    if (player.hasConfirmedCharacterAbsence) {
      return { name: 'character-creation', replace: true };
    }
  }

  return true;
});

export default router;
