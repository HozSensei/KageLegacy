import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import BureauView from '../views/BureauView.vue'
import SquadView from '../views/SquadView.vue'
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
        {
          path: 'market',
          name: 'market',
          component: PlaceholderView,
          props: { titleKey: 'nav.market' },
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: PlaceholderView,
          props: { titleKey: 'nav.inventory' },
        },
        {
          path: 'operation',
          name: 'operation',
          component: PlaceholderView,
          props: { titleKey: 'nav.operation' },
        },
      ],
    },
  ],
})

export default router
