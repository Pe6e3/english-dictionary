<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="navigation">
      <div class="nav-container">
        <RouterLink to="/" class="nav-link" active-class="active" title="Добавить слово">
          🏠
        </RouterLink>
        <RouterLink to="/dictionary" class="nav-link" active-class="active" title="Словарь">
          📚
        </RouterLink>
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <button class="logout-btn" @click="handleLogout" title="Выйти">
          🚪
        </button>
      </div>
    </nav>
    <RouterView />
  </div>
</template>

<script>
import { authService } from '@/utils/auth'

export default {
  name: 'App',
  data() {
    return {
      isDark: true,
      isAuthenticated: false
    }
  },
  watch: {
    '$route'() {
      this.checkAuth()
    }
  },
  mounted() {
    this.initTheme()
    this.checkAuth()
  },
  methods: {
    checkAuth() {
      this.isAuthenticated = authService.isAuthenticated()
    },
    handleLogout() {
      authService.logout()
      this.checkAuth()
      this.$router.push('/login')
    },
    initTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDark = savedTheme === 'dark'
      } else {
        this.isDark = true // По умолчанию темная тема
        localStorage.setItem('theme', 'dark')
      }
      this.applyTheme()
    },
    toggleTheme() {
      this.isDark = !this.isDark
      this.applyTheme()
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
    },
    applyTheme() {
      const root = document.documentElement
      if (this.isDark) {
        root.classList.remove('light')
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
        root.classList.add('light')
      }
    }
  }
}
</script>

<style>
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navigation {
  background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  padding: 8px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 8px;
  padding: 0 12px;
  align-items: center;
  justify-content: flex-start;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  font-size: 20px;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-link.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.theme-toggle {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 20px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.logout-btn {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .nav-container {
    gap: 6px;
    padding: 0 8px;
  }
  
  .nav-link,
  .theme-toggle,
  .logout-btn {
    min-width: 36px;
    height: 36px;
    padding: 6px 10px;
    font-size: 18px;
  }
}
</style>
