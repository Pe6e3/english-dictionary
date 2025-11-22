// Утилита для работы с авторизацией

// Пользователи (в реальном приложении это должно быть на сервере)
const USERS = {
  anton: {
    username: 'anton',
    password: '12345678'
  },
  fedor: {
    username: 'fedor',
    password: '12345678'
  }
}

export const authService = {
  // Проверка авторизации
  isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true'
  },

  // Получение текущего пользователя
  getCurrentUser() {
    const username = localStorage.getItem('username')
    return username ? { username } : null
  },

  // Вход
  login(username, password) {
    const user = USERS[username.toLowerCase()]
    
    if (user && user.password === password) {
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('username', user.username)
      return true
    }
    
    return false
  },

  // Выход
  logout() {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('username')
  }
}

