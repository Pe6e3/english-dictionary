<template>
  <div id="app">
    <nav class="navigation">
      <div class="nav-container">
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <RouterLink to="/" class="nav-link" active-class="active">
          🏠 Добавить слово
        </RouterLink>
        <RouterLink to="/dictionary" class="nav-link" active-class="active">
          📚 Словарь
        </RouterLink>
      </div>
    </nav>
    <RouterView />
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      isDark: true
    }
  },
  mounted() {
    this.initTheme()
  },
  methods: {
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
  padding: 15px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 20px;
  padding: 0 20px;
  align-items: center;
  position: relative;
}

.theme-toggle {
  position: absolute;
  top: 10px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 24px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  z-index: 10;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-link.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 10px;
    padding-bottom: 60px;
  }
  
  .nav-link {
    text-align: center;
  }
  
  .theme-toggle {
    position: absolute;
    top: 10px;
    right: 20px;
  }
}
</style>
