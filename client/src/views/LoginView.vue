<template>
  <div class="login-view">
    <div class="login-container">
      <h1 class="login-title">Авторизация</h1>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="username">Логин</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Введите логин"
            required
            autocomplete="username"
          />
        </div>
        <div class="input-group">
          <label for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Введите пароль"
            required
            autocomplete="current-password"
          />
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { authService } from '@/utils/auth'

export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      errorMessage: '',
      loading: false
    }
  },
  methods: {
    async handleLogin() {
      this.errorMessage = ''
      this.loading = true

      try {
        const success = authService.login(this.username, this.password)
        
        if (success) {
          // Перенаправляем на главную страницу
          const redirect = this.$route.query.redirect || '/'
          this.$router.push(redirect)
        } else {
          this.errorMessage = 'Неверный логин или пароль'
        }
      } catch (error) {
        this.errorMessage = 'Ошибка при входе'
        console.error('Ошибка авторизации:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.login-container {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  max-width: 400px;
  width: 100%;
}

.login-title {
  text-align: center;
  color: #2d3748;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 30px 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
}

.input-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  background: #fed7d7;
  color: #742a2a;
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  border: 1px solid #feb2b2;
}

.login-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .login-container {
    padding: 30px 20px;
  }
  
  .login-title {
    font-size: 1.5rem;
  }
}
</style>

<style>
/* Темная тема */
.dark .login-view {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
}

.dark .login-container {
  background: #2d3748;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dark .login-title {
  color: #e2e8f0;
}

.dark .input-group label {
  color: #e2e8f0;
}

.dark .input-group input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .input-group input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .error-message {
  background: #742a2a;
  color: #fed7d7;
  border-color: #c53030;
}
</style>

