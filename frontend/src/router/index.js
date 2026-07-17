import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import LandingView from '../views/LandingView.vue'
import BureauView from '../views/BureauView.vue'
import CycleJournalView from '../views/CycleJournalView.vue'
import SquadView from '../views/SquadView.vue'
import LeagueView from '../views/LeagueView.vue'
import MarketView from '../views/MarketView.vue'
import PlayerMarketView from '../views/PlayerMarketView.vue'
import TechniqueRefinementView from '../views/TechniqueRefinementView.vue'
import InventoryView from '../views/InventoryView.vue'
import OperationView from '../views/OperationView.vue'
import MissionsView from '../views/MissionsView.vue'
import ReconMissionView from '../views/ReconMissionView.vue'
import TrainingView from '../views/TrainingView.vue'
import ClanView from '../views/ClanView.vue'
import RulesView from '../views/RulesView.vue'
import LoginView from '../views/LoginView.vue'
import EliteIdentityShowcase from '../views/EliteIdentityShowcase.vue'
import SenseiProfileView from '../views/SenseiProfileView.vue'
import ProfileRedirectView from '../views/ProfileRedirectView.vue'
import EliteToolsView from '../views/EliteToolsView.vue'
import ScoutReportView from '../views/ScoutReportView.vue'
import ReconnaissanceView from '../views/ReconnaissanceView.vue'
import AdminView from '../views/AdminView.vue'
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
        { path: 'bureau', name: 'bureau', component: BureauView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'bureau.title' } } },
        { path: 'journal', name: 'journal', component: CycleJournalView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'journal.title' } } },
        { path: 'squad', name: 'squad', component: SquadView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.squad' } } },
        { path: 'missions', name: 'missions', component: MissionsView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.missions' } } },
        {
          path: 'reconnaissance',
          name: 'reconnaissance',
          component: ReconnaissanceView,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.reconnaissance' } },
        },
        {
          path: 'espionnage',
          name: 'scout',
          component: ScoutReportView,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.scout' } },
        },
        {
          path: 'missions/recon/:missionId',
          name: 'recon-mission',
          component: ReconMissionView,
          props: true,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'missions.reconChronicleTitle' } },
        },
        { path: 'clan', name: 'clan', component: ClanView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.clan' } } },
        { path: 'training', name: 'training', component: TrainingView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.training' } } },
        { path: 'league', name: 'league', component: LeagueView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.league' } } },
        { path: 'market', name: 'market', component: MarketView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.market' } } },
        {
          path: 'refinement',
          name: 'refinement',
          component: TechniqueRefinementView,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'techniqueRefinement.title' } },
        },
        { path: 'exchanges', name: 'exchanges', component: PlayerMarketView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.exchanges' } } },
        { path: 'inventory', name: 'inventory', component: InventoryView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.inventory' } } },
        { path: 'operation', name: 'operation', component: OperationView, meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.operation' } } },
        {
          path: 'operation/match/:matchId',
          name: 'operation-match',
          component: OperationView,
          props: true,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'nav.operation' } },
        },
        {
          path: 'design/elite-identity',
          name: 'elite-identity-showcase',
          component: EliteIdentityShowcase,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'eliteShowcase.title' } },
        },
        {
          path: 'profil',
          name: 'profile',
          component: ProfileRedirectView,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'senseiProfile.title' } },
        },
        {
          path: 'elite/outils',
          name: 'elite-tools',
          component: EliteToolsView,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'eliteTools.pageTitle' } },
        },
        {
          path: 'sensei/:userId',
          name: 'sensei-profile',
          component: SenseiProfileView,
          props: true,
          meta: { hero: { image: HERO_VILLAGE, titleKey: 'senseiProfile.title' } },
        },
        {
          path: 'admin',
          name: 'admin',
          component: AdminView,
          meta: {
            requiresAdmin: true,
            hero: { image: HERO_VILLAGE, titleKey: 'nav.admin' },
          },
        },
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

  return true
})

export default router
