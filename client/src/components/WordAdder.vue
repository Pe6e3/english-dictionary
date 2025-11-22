<template>
  <div class="word-adder">
    <div class="container">
      <h1 class="title">Изучение английских слов</h1>
      
      <!-- Кнопка перехода к словарю -->
      <div class="dictionary-link">
        <RouterLink to="/dictionary" class="dictionary-btn">
          📚 Просмотреть словарь
        </RouterLink>
      </div>

      <!-- Переключатель между словами и фразами -->
      <div class="toggle-container">
        <button 
          :class="['toggle-btn', { active: mode === 'word' }]"
          @click="mode = 'word'"
        >
          Слова
        </button>
        <button 
          :class="['toggle-btn', { active: mode === 'phrase' }]"
          @click="mode = 'phrase'"
        >
          Фразы
        </button>
      </div>

      <!-- Форма добавления -->
      <div class="form-container">
        <div class="input-group">
          <label :for="mode === 'word' ? 'englishWord' : 'englishPhrase'">
            {{ mode === 'word' ? 'Английское слово' : 'Английская фраза' }}
          </label>
          <input
            :id="mode === 'word' ? 'englishWord' : 'englishPhrase'"
            v-model="englishInput"
            type="text"
            :placeholder="mode === 'word' ? 'Введите слово...' : 'Введите фразу...'"
            @input="checkExisting"
            @keyup.enter="handleSubmit"
          />
        </div>

        <!-- Показ существующего перевода -->
        <div v-if="existingTranslation" class="existing-translation">
          <div class="translation-card">
            <h3>Это слово уже есть в базе:</h3>
            <div class="translation-content">
              <span class="english">{{ existingTranslation.word || existingTranslation.phrase }}</span>
              <span class="arrow">→</span>
              <span class="russian">{{ existingTranslation.translation }}</span>
            </div>
          </div>
        </div>

        <!-- Форма для нового перевода -->
        <div v-if="!existingTranslation && englishInput.trim()" class="translation-form">
          <div class="input-group">
            <label :for="mode === 'word' ? 'russianWord' : 'russianPhrase'">
              {{ mode === 'word' ? 'Перевод слова' : 'Перевод фразы' }}
            </label>
            <div class="translation-input-container">
              <input
                :id="mode === 'word' ? 'russianWord' : 'russianPhrase'"
                v-model="russianInput"
                type="text"
                :placeholder="mode === 'word' ? 'Введите перевод...' : 'Введите перевод...'"
                @keyup.enter="handleSubmit"
              />
              <button 
                v-if="!autoTranslationLoading && !autoTranslationDone"
                type="button"
                class="auto-translate-btn"
                @click="getAutoTranslation"
                :disabled="!englishInput.trim()"
              >
                <span class="translate-icon">🌐</span>
                Автоперевод
              </button>
              <button 
                v-if="autoTranslationLoading"
                type="button"
                class="auto-translate-btn loading"
                disabled
              >
                <span class="loading-spinner"></span>
                Перевод...
              </button>
              <button 
                v-if="autoTranslationDone"
                type="button"
                class="auto-translate-btn success"
                disabled
              >
                <span class="success-icon">✅</span>
                Переведено
              </button>
            </div>
          </div>

          <!-- Выпадающий список вариантов перевода -->
          <div v-if="translationOptions.length > 1" class="translation-options">
            <label class="options-label">Выберите вариант перевода:</label>
            <div class="options-grid">
              <div 
                v-for="(option, index) in translationOptions" 
                :key="index"
                :class="['option-card', { selected: selectedTranslationIndex === index }]"
                @click="selectTranslation(index)"
              >
                <div class="option-text">{{ option.text }}</div>
                <div class="option-quality" v-if="option.quality">
                  Качество: {{ option.quality }}%
                </div>
                <div class="option-source" v-if="option.source">
                  Источник: {{ option.source }}
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="submit-btn"
            @click="handleSubmit"
            :disabled="!russianInput.trim()"
          >
            Добавить
          </button>
        </div>

        <!-- Сообщения об ошибках и успехе -->
        <div v-if="message" :class="['message', messageType]">
          {{ message }}
        </div>
      </div>

      <!-- Список добавленных слов/фраз -->
      <div class="words-list">
        <h2>{{ mode === 'word' ? 'Добавленные слова' : 'Добавленные фразы' }}</h2>
        <div v-if="items.length === 0" class="empty-state">
          Пока ничего не добавлено
        </div>
        <div v-else class="items-grid">
          <div 
            v-for="item in items" 
            :key="item.id" 
            class="item-card"
          >
            <div class="item-content">
              <span class="english">{{ mode === 'word' ? item.english_word : item.english_phrase }}</span>
              <span class="arrow">→</span>
              <span class="russian">{{ item.russian_translation }}</span>
            </div>
            <div class="item-date">
              {{ formatDate(item.created_at) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { RouterLink } from 'vue-router'
import { authService } from '@/utils/auth'

export default {
  name: 'WordAdder',
  components: {
    RouterLink
  },
  data() {
    return {
      mode: 'word', // 'word' или 'phrase'
      englishInput: '',
      russianInput: '',
      existingTranslation: null,
      message: '',
      messageType: 'success',
      items: [],
      checkTimeout: null,
      autoTranslationLoading: false,
      autoTranslationDone: false,
      autoTranslationResult: null,
      translationOptions: [], // Новый массив для вариантов перевода
      selectedTranslationIndex: 0, // Индекс выбранного варианта
      autoTranslateTimeout: null // Таймаут для автоперевода
    }
  },
  computed: {
    apiBaseUrl() {
      // Используем относительный путь через nginx прокси
      return '/english-api/api'
    },
    currentUsername() {
      const user = authService.getCurrentUser()
      return user ? user.username : null
    }
  },
  mounted() {
    this.loadItems()
    // Фокус на поле ввода английского языка при загрузке страницы
    this.$nextTick(() => {
      this.focusEnglishInput()
    })
  },
  methods: {
    async checkExisting() {
      // Очищаем предыдущий таймаут
      if (this.checkTimeout) {
        clearTimeout(this.checkTimeout)
      }

      // Очищаем предыдущий таймаут автоперевода
      if (this.autoTranslateTimeout) {
        clearTimeout(this.autoTranslateTimeout)
      }

      // Сбрасываем состояние автоперевода при изменении ввода
      this.autoTranslationDone = false
      this.autoTranslationResult = null
      this.translationOptions = []
      this.selectedTranslationIndex = 0

      // Устанавливаем новый таймаут для проверки через 500мс после остановки ввода
      this.checkTimeout = setTimeout(async () => {
        const input = this.englishInput.trim()
        if (!input) {
          this.existingTranslation = null
          return
        }

        try {
          const endpoint = this.mode === 'word' ? 'check-word' : 'check-phrase'
          const url = `${this.apiBaseUrl}/${endpoint}/${encodeURIComponent(input)}?username=${encodeURIComponent(this.currentUsername)}`
          console.log('Checking URL:', url)
          
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()

          if (data.exists) {
            this.existingTranslation = data
            this.message = ''
          } else {
            this.existingTranslation = null
            // Автоперевод отключен из-за проблем с CORS
            // Пользователь может нажать кнопку "Автоперевод" вручную
          }
        } catch (error) {
          console.error('Ошибка при проверке:', error)
          this.showMessage('Ошибка при проверке слова', 'error')
        }
      }, 500)
    },

    async handleSubmit() {
      if (!this.englishInput.trim() || !this.russianInput.trim()) {
        this.showMessage('Заполните все поля', 'error')
        return
      }

      try {
        const endpoint = this.mode === 'word' ? 'add-word' : 'add-phrase'
        const body = this.mode === 'word' 
          ? { englishWord: this.englishInput.trim(), russianTranslation: this.russianInput.trim(), username: this.currentUsername }
          : { englishPhrase: this.englishInput.trim(), russianTranslation: this.russianInput.trim(), username: this.currentUsername }

        const url = `${this.apiBaseUrl}/${endpoint}`
        console.log('Submitting to URL:', url)
        console.log('Body:', body)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        this.showMessage(data.message, 'success')
        this.englishInput = ''
        this.russianInput = ''
        this.existingTranslation = null
        this.autoTranslationDone = false
        this.autoTranslationResult = null
        this.translationOptions = []
        this.selectedTranslationIndex = 0
        this.loadItems()
        
        // Фокус на поле ввода английского языка после сохранения
        this.$nextTick(() => {
          this.focusEnglishInput()
        })
      } catch (error) {
        console.error('Ошибка при добавлении:', error)
        this.showMessage(error.message || 'Ошибка при добавлении', 'error')
      }
    },

    async loadItems() {
      try {
        const endpoint = this.mode === 'word' ? 'words' : 'phrases'
        const url = `${this.apiBaseUrl}/${endpoint}?username=${encodeURIComponent(this.currentUsername)}`
        console.log('Loading from URL:', url)
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        this.items = data
      } catch (error) {
        console.error('Ошибка при загрузке:', error)
        this.showMessage('Ошибка при загрузке данных', 'error')
      }
    },

    showMessage(text, type = 'success') {
      this.message = text
      this.messageType = type
      setTimeout(() => {
        this.message = ''
      }, 5000)
    },

    formatDate(dateString) {
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        return 'Неизвестная дата'
      }
    },

    async getAutoTranslation() {
      if (!this.englishInput.trim()) {
        this.showMessage('Введите английское слово для перевода', 'error')
        return
      }

      this.autoTranslationLoading = true
      this.autoTranslationDone = false
      this.autoTranslationResult = null
      this.translationOptions = [] // Очищаем варианты перевода
      this.selectedTranslationIndex = 0 // Сбрасываем выбранный вариант

      try {
        // Пробуем основной API (LibreTranslate)
        const url = 'https://libretranslate.de/translate'
        const body = {
          q: this.englishInput,
          source: 'en',
          target: 'ru'
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        // LibreTranslate возвращает один вариант
        const options = [{
          text: data.translatedText,
          quality: 100,
          source: 'LibreTranslate'
        }]
        
        this.updateTranslationOptions(options)
        this.russianInput = options[0].text
        this.autoTranslationResult = data
        this.autoTranslationDone = true
        this.showMessage('Автоперевод завершен', 'success')
      } catch (error) {
        // Тихая обработка ошибок CORS - пробуем альтернативный API
        // Не логируем в консоль, так как это ожидаемая ошибка
        
        // Пробуем альтернативный API
        try {
          const alternativeUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(this.englishInput)}&langpair=en|ru`
          
          const altResponse = await fetch(alternativeUrl)
          if (!altResponse.ok) {
            throw new Error(`HTTP error! status: ${altResponse.status}`)
          }
          
          const altData = await altResponse.json()
          if (altData.responseData && altData.responseData.translatedText) {
            // MyMemory API возвращает несколько вариантов
            const options = []
            
            // Основной перевод
            options.push({
              text: altData.responseData.translatedText,
              quality: 100,
              source: 'MyMemory (основной)'
            })
            
            // Дополнительные варианты из matches
            if (altData.matches && altData.matches.length > 0) {
              altData.matches.forEach(match => {
                if (match.translation && match.translation !== altData.responseData.translatedText) {
                  options.push({
                    text: match.translation,
                    quality: match.quality || 0,
                    source: match['created-by'] || 'MyMemory'
                  })
                }
              })
            }
            
            // Сортируем по качеству (лучшие первые)
            options.sort((a, b) => b.quality - a.quality)
            
            this.updateTranslationOptions(options)
            this.russianInput = options[0].text
            this.autoTranslationResult = altData
            this.autoTranslationDone = true
            
            if (options.length > 1) {
              this.showMessage(`Автоперевод завершен. Найдено ${options.length} вариантов.`, 'success')
            } else {
              this.showMessage('Автоперевод завершен (альтернативный API)', 'success')
            }
          } else {
            throw new Error('Нет данных перевода')
          }
        } catch (altError) {
          // Тихая обработка ошибок - не показываем сообщение об ошибке, если автоперевод не работает
          // Пользователь может ввести перевод вручную
          // Не логируем в консоль, так как это ожидаемая ошибка
        }
      } finally {
        this.autoTranslationLoading = false
      }
    },

    // Метод для обновления вариантов перевода
    updateTranslationOptions(options) {
      this.translationOptions = options
      this.selectedTranslationIndex = 0 // Сбрасываем выбранный вариант при обновлении
    },

    // Метод для выбора варианта перевода
    selectTranslation(index) {
      this.selectedTranslationIndex = index
      this.russianInput = this.translationOptions[index].text
      this.autoTranslationDone = true // Считаем, что перевод выбран
      this.showMessage('Выбран вариант перевода', 'success')
    },

    // Метод для фокуса на поле ввода английского языка
    focusEnglishInput() {
      const englishInputElement = this.$el.querySelector(`#${this.mode === 'word' ? 'englishWord' : 'englishPhrase'}`)
      if (englishInputElement) {
        englishInputElement.focus()
      }
    }
  },
  watch: {
    mode() {
      this.englishInput = ''
      this.russianInput = ''
      this.existingTranslation = null
      this.message = ''
      this.autoTranslationDone = false
      this.autoTranslationResult = null
      this.translationOptions = []
      this.selectedTranslationIndex = 0
      this.loadItems()
      
      // Фокус на поле ввода английского языка при смене режима
      this.$nextTick(() => {
        this.focusEnglishInput()
      })
    }
  }
}
</script>

<style scoped>
.word-adder {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.title {
  text-align: center;
  color: #2d3748;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  padding: 40px 20px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.dictionary-link {
  text-align: center;
  margin-bottom: 20px;
}

.dictionary-btn {
  display: inline-block;
  background: #4299e1;
  color: white;
  padding: 12px 25px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
}

.dictionary-btn:hover {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
}

.toggle-container {
  display: flex;
  background: #f7fafc;
  padding: 20px;
  gap: 10px;
}

.toggle-btn {
  flex: 1;
  padding: 15px 20px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  color: #718096;
  border: 2px solid transparent;
}

.toggle-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.toggle-btn:hover:not(.active) {
  background: #edf2f7;
  transform: translateY(-1px);
}

.form-container {
  padding: 30px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
}

.input-group input {
  width: 100%;
  padding: 15px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.existing-translation {
  margin: 20px 0;
}

.translation-card {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.translation-card h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
}

.translation-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  font-size: 18px;
}

.english {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
}

.arrow {
  font-size: 24px;
  font-weight: bold;
}

.russian {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
}

.translation-form {
  background: #f7fafc;
  padding: 25px;
  border-radius: 12px;
  margin: 20px 0;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  padding: 15px 20px;
  border-radius: 12px;
  margin: 20px 0;
  font-weight: 600;
  text-align: center;
}

.message.success {
  background: #c6f6d5;
  color: #22543d;
  border: 1px solid #9ae6b4;
}

.message.error {
  background: #fed7d7;
  color: #742a2a;
  border: 1px solid #feb2b2;
}

.words-list {
  padding: 30px;
  background: #f7fafc;
}

.words-list h2 {
  color: #2d3748;
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  color: #718096;
  font-style: italic;
  padding: 40px;
}

.items-grid {
  display: grid;
  gap: 15px;
}

.item-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 16px;
}

.item-content .english {
  font-weight: 600;
  color: #2d3748;
}

.item-content .arrow {
  color: #718096;
  font-weight: bold;
}

.item-content .russian {
  font-weight: 600;
  color: #4a5568;
}

.item-date {
  font-size: 12px;
  color: #a0aec0;
}

.translation-input-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}

.translation-input-container input {
  flex: 1;
  padding-right: 120px; /* Место для кнопки */
}

.auto-translate-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  padding: 8px 15px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #4299e1;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1;
  white-space: nowrap;
}

.auto-translate-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-50%) scale(1.05);
}

.auto-translate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auto-translate-btn.loading {
  background: #f6ad55;
}

.auto-translate-btn.success {
  background: #48bb78;
}

.translate-icon,
.loading-spinner,
.success-icon {
  font-size: 16px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.translation-options {
  margin-top: 20px;
  padding: 15px 20px;
  background: #edf2f7;
  border-radius: 12px;
  border: 1px solid #cbd5e0;
}

.options-label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
}

.options-grid {
  display: grid;
  gap: 10px;
}

.option-card {
  background: white;
  padding: 15px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
}

.option-card:hover {
  background: #edf2f7;
  border-color: #a0aec0;
}

.option-card.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.option-card.selected .option-quality,
.option-card.selected .option-source {
  color: rgba(255, 255, 255, 0.8);
}

.option-text {
  font-weight: 600;
  font-size: 16px;
}

.option-quality,
.option-source {
  font-size: 12px;
  color: #718096;
}

@media (max-width: 768px) {
  .word-adder {
    padding: 10px;
  }
  
  .container {
    margin: 0;
    border-radius: 15px;
  }
  
  .title {
    font-size: 1.75rem;
    padding: 25px 15px 15px;
  }
  
  .dictionary-btn {
    padding: 12px 20px;
    font-size: 15px;
  }
  
  .toggle-container {
    padding: 15px;
    gap: 8px;
  }
  
  .toggle-btn {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  .form-container,
  .words-list {
    padding: 20px;
  }
  
  .input-group input {
    font-size: 16px; /* Предотвращает зум на iOS */
    padding: 14px 18px;
  }
  
  .translation-input-container input {
    padding-right: 110px;
  }
  
  .auto-translate-btn {
    font-size: 11px;
    padding: 6px 12px;
    right: 8px;
  }
  
  .translation-content {
    flex-direction: column;
    gap: 10px;
  }

  .translation-options {
    margin-top: 15px;
    padding: 12px 15px;
  }

  .options-grid {
    gap: 8px;
  }

  .option-card {
    padding: 12px 15px;
  }

  .option-text {
    font-size: 14px;
  }

  .option-quality,
  .option-source {
    font-size: 11px;
  }
  
  .submit-btn {
    padding: 14px 20px;
    font-size: 16px;
    min-height: 48px;
  }
  
  .items-grid {
    gap: 12px;
  }
  
  .item-card {
    padding: 16px;
  }
  
  .item-content {
    font-size: 15px;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .word-adder {
    padding: 5px;
  }
  
  .container {
    border-radius: 12px;
  }
  
  .title {
    font-size: 1.5rem;
    padding: 20px 12px 12px;
  }
  
  .dictionary-btn {
    padding: 10px 18px;
    font-size: 14px;
  }
  
  .toggle-container {
    padding: 12px;
  }
  
  .toggle-btn {
    padding: 10px 12px;
    font-size: 13px;
  }
  
  .form-container,
  .words-list {
    padding: 15px;
  }
  
  .input-group label {
    font-size: 13px;
  }
  
  .input-group input {
    padding: 12px 15px;
    font-size: 16px;
  }
  
  .translation-input-container input {
    padding-right: 100px;
  }
  
  .auto-translate-btn {
    font-size: 10px;
    padding: 5px 10px;
  }
  
  .translation-card {
    padding: 15px;
  }
  
  .translation-card h3 {
    font-size: 16px;
  }
  
  .translation-content {
    font-size: 16px;
    gap: 8px;
  }
  
  .english,
  .russian {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .submit-btn {
    padding: 12px 18px;
    font-size: 15px;
  }
  
  .words-list h2 {
    font-size: 1.25rem;
  }
  
  .item-card {
    padding: 12px;
  }
  
  .item-content {
    font-size: 14px;
    gap: 10px;
  }
  
  .item-date {
    font-size: 11px;
  }
}

</style>

<style>
/* Темная тема */
.dark .word-adder {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
}

.dark .word-adder .container {
  background: #2d3748;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dark .word-adder .title {
  color: #e2e8f0;
}

.dark .word-adder .toggle-container {
  background: #1a202c;
}

.dark .word-adder .toggle-btn {
  background: #2d3748;
  color: #a0aec0;
}

.dark .word-adder .toggle-btn:hover:not(.active) {
  background: #374151;
}

.dark .word-adder .form-container {
  background: #2d3748;
}

.dark .word-adder .input-group label {
  color: #e2e8f0;
}

.dark .word-adder .input-group input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .word-adder .input-group input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .word-adder .translation-form {
  background: #1a202c;
}

.dark .word-adder .words-list {
  background: #1a202c;
}

.dark .word-adder .words-list h2 {
  color: #e2e8f0;
}

.dark .word-adder .item-card {
  background: #2d3748;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.dark .word-adder .item-content .english,
.dark .word-adder .item-content .russian {
  color: #e2e8f0;
}

.dark .word-adder .item-date {
  color: #718096;
}

.dark .word-adder .translation-options {
  background: #2d3748;
  border-color: #4a5568;
}

.dark .word-adder .options-label {
  color: #e2e8f0;
}

.dark .word-adder .option-card {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .word-adder .option-card:hover {
  background: #2d3748;
}

.dark .word-adder .option-quality,
.dark .word-adder .option-source {
  color: #a0aec0;
}
</style>
