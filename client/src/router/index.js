import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import { authService } from '../utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    }
  ]
})

// Навигационный guard для проверки авторизации
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth && !authService.isAuthenticated()) {
    // Сохраняем путь, на который пользователь хотел попасть
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else if (to.path === '/login' && authService.isAuthenticated()) {
    // Если пользователь уже авторизован и пытается зайти на страницу логина
    next('/')
  } else {
    next()
  }
})

export default router
