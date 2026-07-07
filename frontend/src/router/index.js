import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import LandingView from '../views/LandingView.vue'
import BureauView from '../views/BureauView.vue'
import SquadView from '../views/SquadView.vue'
import LeagueView from '../views/LeagueView.vue'
import MarketView from '../views/MarketView.vue'
import PlayerMarketView from '../views/PlayerMarketView.vue'
import InventoryView from '../views/InventoryView.vue'
import OperationView from '../views/OperationView.vue'
import MissionsView from '../views/MissionsView.vue'
import TrainingView from '../views/TrainingView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: LandingView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: LoginView },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: 'bureau', name: 'bureau', component: BureauView },
        { path: 'squad', name: 'squad', component: SquadView },
        { path: 'missions', name: 'missions', component: MissionsView },
        { path: 'training', name: 'training', component: TrainingView },
        { path: 'league', name: 'league', component: LeagueView },
        { path: 'market', name: 'market', component: MarketView },
        { path: 'exchanges', name: 'exchanges', component: PlayerMarketView },
        { path: 'inventory', name: 'inventory', component: InventoryView },
        { path: 'operation', name: 'operation', component: OperationView },
        {
          path: 'operation/match/:matchId',
          name: 'operation-match',
          component: OperationView,
          props: true,
        },
      ],
    },
  ],
})

const PUBLIC_PATHS = new Set(['/', '/login', '/register'])

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
  return true
})

export default router
