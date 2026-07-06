import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import BureauView from '../views/BureauView.vue'
import SquadView from '../views/SquadView.vue'
import LeagueView from '../views/LeagueView.vue'
import MarketView from '../views/MarketView.vue'
import PlayerMarketView from '../views/PlayerMarketView.vue'
import InventoryView from '../views/InventoryView.vue'
import OperationView from '../views/OperationView.vue'
import PlaceholderView from '../views/PlaceholderView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
      ],
    },
  ],
})

export default router
