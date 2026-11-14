import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import RulesView from '../views/RulesView.vue'
import PlaceholderView from '../views/PlaceholderView.vue'
import Profile from '../views/Profile.vue'
import CharacterCreation from '../views/CharacterCreation.vue'
import CollectionView from '../views/CollectionView.vue'
import DeckBuilderView from '../views/DeckBuilderView.vue'
import TalentTreeView from '../views/TalentTreeView.vue'
import MissionsCombatView from '../views/MissionsCombatView.vue'
import MissionRunView from '../views/MissionRunView.vue'
import CombatView from '../views/CombatView.vue'
import ShopView from '../views/ShopView.vue'
import BattlePassView from '../views/BattlePassView.vue'
import PvpQueueView from '../views/PvpQueueView.vue'
import PvpDuelView from '../views/PvpDuelView.vue'
import { useAuthStore } from '../stores/auth'

const HERO_VILLAGE = '/images/hero-village.png'

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
          path: 'bureau',
          name: 'bureau',
          component: PlaceholderView,
          props: { titleKey: 'nav.bureau' },
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'bureau.title' }, requiresCharacter: true },
        },
        {
          path: 'character-creation',
          name: 'character-creation',
          component: CharacterCreation,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'player.createTitle' } },
        },
        {
          path: 'profil',
          name: 'profile',
          component: Profile,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'player.profileTitle' },
            requiresCharacter: true,
          },
        },
        {
          path: 'collection',
          name: 'collection',
          component: CollectionView,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'cards.collectionTitle' },
            requiresCharacter: true,
          },
        },
        {
          path: 'decks',
          name: 'decks',
          component: DeckBuilderView,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'cards.deckBuilderTitle' },
            requiresCharacter: true,
          },
        },
        {
          path: 'talents',
          name: 'talents',
          component: TalentTreeView,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'talents.title' },
            requiresCharacter: true,
          },
        },
        {
          path: 'missions',
          name: 'missions',
          component: MissionsCombatView,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'combat.missionsTitle' },
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
            hero: { image: HERO_VILLAGE, titleKey: 'shop.title' },
            requiresCharacter: true,
          },
        },
        {
          path: 'battle-pass',
          name: 'battle-pass',
          component: BattlePassView,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'battlePass.title' },
            requiresCharacter: true,
          },
        },
        {
          path: 'pvp',
          name: 'pvp',
          component: PvpQueueView,
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: 'pvp.queueTitle' },
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
        // Routes legacy archivées → placeholder jusqu'aux phases suivantes
        ...[
          ['inventory', 'nav.inventory', 'nav.inventory'],
          ['journal', 'nav.journal', 'journal.title'],
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
          ['design/elite-identity', 'eliteShowcase.title', 'eliteShowcase.title', 'elite-identity-showcase'],
          ['elite/outils', 'eliteTools.pageTitle', 'eliteTools.pageTitle', 'elite-tools'],
          ['admin', 'nav.admin', 'nav.admin', 'admin'],
        ].map(([path, titleKey, heroKey, name]) => ({
          path,
          name: name || path.replace(/\//g, '-'),
          component: PlaceholderView,
          props: { titleKey },
          meta: {
            hero: { image: HERO_VILLAGE, titleKey: heroKey },
            ...(path === 'admin' ? { requiresAdmin: true } : {}),
          },
        })),
      ],
    },
  ],
})

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/rules'])

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (PUBLIC_PATHS.has(to.path)) {
    if (!auth.checked) await auth.fetchMe()
    if (auth.user && (to.path === '/' || to.path === '/login' || to.path === '/register')) {
      return { path: '/bureau' }
    }
    return true
  }

  if (!auth.checked) await auth.fetchMe()
  if (!auth.user) return { path: '/' }
  if (to.meta.requiresAdmin && !auth.user.isAdmin) return { path: '/bureau' }

  const eliteRouteNames = new Set(['elite-tools', 'elite-identity-showcase'])
  if (eliteRouteNames.has(to.name)) {
    const { useEliteStore } = await import('../stores/elite')
    const elite = useEliteStore()
    if (!elite.subscription && auth.user) {
      await elite.fetchElite()
    }
    if (!elite.featureEnabled) return { path: '/bureau' }
  }

  if (to.name !== 'character-creation') {
    const { usePlayerStore } = await import('../stores/player')
    const player = usePlayerStore()
    if (!player.checked) await player.fetchPlayer()
    if (!player.character && to.meta.requiresCharacter !== false) {
      // Redirect to creation for authenticated pages that need a character
      if (to.name !== 'character-creation') {
        return { name: 'character-creation' }
      }
    }
  }

  return true
})

export default router
