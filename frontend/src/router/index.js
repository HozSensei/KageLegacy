import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import BureauView from '../views/BureauView.vue'
import SquadView from '../views/SquadView.vue'
import LeagueView from '../views/LeagueView.vue'
import MarketView from '../views/MarketView.vue'
import PlayerMarketView from '../views/PlayerMarketView.vue'
import InventoryView from '../views/InventoryView.vue'
import OperationView from '../views/OperationView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: LoginView },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'bureau', component: BureauView },
        { path: 'squad', name: 'squad', component: SquadView },
        { path: 'league', name: 'league', component: LeagueView },
        {
          path: 'market',
          name: 'market',
          component: MarketView,
        },
        {
          path: 'exchanges',
          name: 'exchanges',
          component: PlayerMarketView,
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: InventoryView,
        },
        {
          path: 'operation',
          name: 'operation',
          component: OperationView,
        },
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

router.beforeEach(async (to) => {
  if (to.path === '/login' || to.path === '/register') return true
  const auth = useAuthStore()
  if (!auth.checked) await auth.fetchMe()
  return true
})

export default router
