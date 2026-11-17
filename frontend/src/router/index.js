import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import LandingView from '../views/LandingView.vue';
import LoginView from '../views/LoginView.vue';
import RulesView from '../views/RulesView.vue';
import PlaceholderView from '../views/PlaceholderView.vue';
import HubView from '../views/HubView.vue';
import Profile from '../views/Profile.vue';
import CharacterCreation from '../views/CharacterCreation.vue';
import CollectionView from '../views/CollectionView.vue';
import DeckBuilderView from '../views/DeckBuilderView.vue';
import TalentTreeView from '../views/TalentTreeView.vue';
import MissionsCombatView from '../views/MissionsCombatView.vue';
import MissionRunView from '../views/MissionRunView.vue';
import CombatView from '../views/CombatView.vue';
import ShopView from '../views/ShopView.vue';
import BattlePassView from '../views/BattlePassView.vue';
import JournalView from '../views/JournalView.vue';
import PvpQueueView from '../views/PvpQueueView.vue';
import PvpDuelView from '../views/PvpDuelView.vue';
import LeaderboardView from '../views/LeaderboardView.vue';
import AdminView from '../views/AdminView.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: LandingView },
    { path: '/rules', name: 'rules', component: RulesView },
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
          path: 'bureau',
          redirect: { name: 'hub' },
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
          },
        },
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
          path: 'pvp',
          name: 'pvp',
          component: PvpQueueView,
          meta: {
            requiresCharacter: true,
          },
        },
        {
          path: 'pvp/duel/:id',
          name: 'pvp-duel',
          component: PvpDuelView,
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
        // Routes legacy archivées → placeholder jusqu'aux phases suivantes
        ...[
          ['inventory', 'nav.inventory', 'nav.inventory'],
          ['squad', 'nav.squad', 'nav.squad'],
          ['reconnaissance', 'nav.reconnaissance', 'nav.reconnaissance'],
          ['espionnage', 'nav.scout', 'nav.scout', 'scout'],
          ['clan', 'nav.clan', 'nav.clan'],
          ['village', 'nav.village', 'nav.village'],
          ['training', 'nav.training', 'nav.training'],
          ['league', 'nav.league', 'nav.league'],
          ['market', 'nav.market', 'nav.market'],
          ['refinement', 'nav.refinement', 'techniqueRefinement.title'],
          ['exchanges', 'nav.exchanges', 'nav.exchanges'],
          ['operation', 'nav.operation', 'nav.operation'],
          [
            'design/elite-identity',
            'eliteShowcase.title',
            'eliteShowcase.title',
            'elite-identity-showcase',
          ],
          ['elite/outils', 'eliteTools.pageTitle', 'eliteTools.pageTitle', 'elite-tools'],
          ['admin', 'nav.admin', 'nav.admin', 'admin'],
        ].map(([path, titleKey, , name]) => ({
          path,
          name: name || path.replace(/\//g, '-'),
          component: path === 'admin' ? AdminView : PlaceholderView,
          props: path === 'admin' ? {} : { titleKey },
          meta: {
            ...(path === 'admin' ? { requiresAdmin: true } : {}),
          },
        })),
      ],
    },
  ],
});

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/rules']);

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

  const eliteRouteNames = new Set(['elite-tools', 'elite-identity-showcase']);
  if (eliteRouteNames.has(to.name)) {
    const { useEliteStore } = await import('../stores/elite');
    const elite = useEliteStore();
    if (!elite.subscription && auth.user) {
      await elite.fetchElite();
    }
    if (!elite.featureEnabled) return { path: '/home' };
  }

  // Hub + character creation are reachable without a character (empty-state / onboarding).
  const allowWithoutCharacter = new Set(['hub', 'character-creation', 'admin']);
  if (!allowWithoutCharacter.has(to.name)) {
    const { usePlayerStore } = await import('../stores/player');
    const player = usePlayerStore();
    if (!player.checked) await player.fetchPlayer();
    if (player.hasConfirmedCharacterAbsence && to.meta.requiresCharacter !== false) {
      return { name: 'character-creation' };
    }
  }

  return true;
});

export default router;
