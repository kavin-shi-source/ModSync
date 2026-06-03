import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/template'
  },
  {
    path: '/template',
    name: 'Template',
    component: () => import('@/views/TemplateView.vue')
  },
  {
    path: '/server/:id',
    name: 'ServerDetail',
    component: () => import('@/views/ServerView.vue')
  },
  {
    path: '/server/:id/mods',
    name: 'ModManager',
    component: () => import('@/views/ModManager.vue')
  },
  {
    path: '/sync',
    name: 'SyncPanel',
    component: () => import('@/views/SyncPanel.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
