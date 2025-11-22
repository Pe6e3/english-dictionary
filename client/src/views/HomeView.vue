<template>
  <div class="translations-view">
    <div class="container">
      <!-- Объединенное поле поиска и ввода -->
      <div class="form-container">
        <div class="input-group">
          <label for="englishText">Поиск или ввод английского текста</label>
          <input
            id="englishText"
            v-model="englishInput"
            type="text"
            placeholder="Введите слово или фразу для поиска или добавления..."
            @input="handleEnglishInput"
            @keyup.enter="handleSubmit"
          />
        </div>

        <!-- Показ существующего перевода -->
        <div v-if="existingTranslation" class="existing-translation">
          <div class="translation-card">
            <h3>Этот перевод уже есть в базе:</h3>
            <div class="translation-content">
              <span class="english">{{ existingTranslation.text }}</span>
              <span class="arrow">→</span>
              <span class="russian">{{ existingTranslation.translation }}</span>
            </div>
          </div>
        </div>

        <!-- Форма для нового перевода -->
        <div v-if="!existingTranslation && englishInput.trim()" class="translation-form">
          <div class="input-group">
            <label for="russianTranslation">Русский перевод</label>
            <div class="translation-input-container">
              <input
                id="russianTranslation"
                v-model="russianInput"
                type="text"
                placeholder="Введите перевод..."
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

      <!-- Карточки переводов -->
      <div class="translations-container">
        <div v-if="filteredItems.length === 0" class="empty-state">
          {{ englishInput ? 'Ничего не найдено' : 'Пока ничего не добавлено' }}
        </div>
        <div v-else class="items-grid">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="item-card"
            @click="toggleTranslation(item)"
          >
            <!-- Режим просмотра -->
            <div v-if="!item.editing" class="item-content-wrapper">
              <div class="item-content">
                <span class="english">{{ item.english_text }}</span>
                <span class="arrow">→</span>
                <span 
                  class="russian"
                  :class="{ 'visible': item.showTranslation }"
                >
                  {{ item.russian_translation }}
                </span>
              </div>
              <div class="item-footer">
                <span class="item-date">{{ formatDate(item.created_at) }}</span>
                <div class="item-actions" @click.stop>
                  <button 
                    class="item-action-btn edit"
                    @click.stop="startEdit(item)"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button 
                    class="item-action-btn delete"
                    @click.stop="confirmDelete(item)"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <!-- Режим редактирования -->
            <div v-else class="item-edit" @click.stop>
              <div class="item-edit-inputs">
                <div class="item-edit-group">
                  <label class="item-edit-label">Английский текст</label>
                  <input
                    v-model="item.editEnglish"
                    type="text"
                    class="item-edit-input"
                    placeholder="Английский текст"
                  />
                </div>
                <div class="item-edit-group">
                  <label class="item-edit-label">Русский перевод</label>
                  <input
                    v-model="item.editRussian"
                    type="text"
                    class="item-edit-input"
                    placeholder="Русский перевод"
                  />
                </div>
              </div>
              <div class="item-edit-actions">
                <button 
                  class="save-btn"
                  @click="saveEdit(item)"
                  :disabled="!item.editEnglish.trim() || !item.editRussian.trim()"
                >
                  💾 Сохранить
                </button>
                <button 
                  class="cancel-btn"
                  @click="cancelEdit(item)"
                >
                  ❌ Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Модальное окно подтверждения удаления -->
      <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
        <div class="modal" @click.stop>
          <h3>Подтверждение удаления</h3>
          <p>Удалить "{{ itemToDelete ? itemToDelete.english_text : '' }}"?</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeDeleteModal">Отмена</button>
            <button class="delete-btn" @click="deleteItem">Удалить</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authService } from '@/utils/auth'

export default {
  name: 'HomeView',
  inject: ['updateTranslationsCount'],
  data() {
    return {
      englishInput: '',
      russianInput: '',
      existingTranslation: null,
      message: '',
      messageType: 'success',
      translations: [],
      checkTimeout: null,
      autoTranslationLoading: false,
      autoTranslationDone: false,
      autoTranslationResult: null,
      translationOptions: [],
      selectedTranslationIndex: 0,
      autoTranslateTimeout: null,
      showTranslationMap: {},
      showDeleteModal: false,
      itemToDelete: null
    }
  },
  computed: {
    apiBaseUrl() {
      return '/english-api/api'
    },
    currentUsername() {
      const user = authService.getCurrentUser()
      return user ? user.username : null
    },
    allItems() {
      return this.translations.map(item => ({ 
        ...item, 
        showTranslation: this.showTranslationMap[item.id] || false
      }))
    },
    filteredItems() {
      if (!this.englishInput.trim()) return this.allItems
      
      const query = this.englishInput.toLowerCase()
      return this.allItems.filter(item => {
        const english = item.english_text
        return english.toLowerCase().includes(query) || 
               item.russian_translation.toLowerCase().includes(query)
      })
    }
  },
  mounted() {
    this.loadData()
    this.$nextTick(() => {
      this.focusEnglishInput()
    })
  },
  methods: {
    async loadData() {
      try {
        const response = await fetch(`${this.apiBaseUrl}/translations?username=${encodeURIComponent(this.currentUsername)}`)
        if (response.ok) {
          this.translations = await response.json()
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error)
      }
    },
    handleEnglishInput() {
      // При вводе проверяем существование перевода и фильтруем список
      this.checkExisting()
    },
    async checkExisting() {
      if (this.checkTimeout) {
        clearTimeout(this.checkTimeout)
      }
      if (this.autoTranslateTimeout) {
        clearTimeout(this.autoTranslateTimeout)
      }

      this.autoTranslationDone = false
      this.autoTranslationResult = null
      this.translationOptions = []
      this.selectedTranslationIndex = 0

      this.checkTimeout = setTimeout(async () => {
        const input = this.englishInput.trim()
        if (!input) {
          this.existingTranslation = null
          return
        }

        try {
          const url = `${this.apiBaseUrl}/check-translation/${encodeURIComponent(input)}?username=${encodeURIComponent(this.currentUsername)}`
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()

          if (data.exists) {
            this.existingTranslation = { text: data.text, translation: data.translation }
            this.message = ''
          } else {
            this.existingTranslation = null
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
        const body = { 
          englishText: this.englishInput.trim(), 
          russianTranslation: this.russianInput.trim(), 
          username: this.currentUsername 
        }

        const url = `${this.apiBaseUrl}/add-translation`
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
        
        // Обновляем список переводов и счетчик
        this.loadData()
        if (this.updateTranslationsCount) {
          this.updateTranslationsCount()
        }
        
        this.$nextTick(() => {
          this.focusEnglishInput()
        })
      } catch (error) {
        console.error('Ошибка при добавлении:', error)
        this.showMessage(error.message || 'Ошибка при добавлении', 'error')
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
          year: 'numeric'
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
      this.translationOptions = []
      this.selectedTranslationIndex = 0

      try {
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
        try {
          const alternativeUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(this.englishInput)}&langpair=en|ru`
          
          const altResponse = await fetch(alternativeUrl)
          if (!altResponse.ok) {
            throw new Error(`HTTP error! status: ${altResponse.status}`)
          }
          
          const altData = await altResponse.json()
          if (altData.responseData && altData.responseData.translatedText) {
            const options = []
            
            options.push({
              text: altData.responseData.translatedText,
              quality: 100,
              source: 'MyMemory (основной)'
            })
            
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
          // Тихая обработка ошибок
        }
      } finally {
        this.autoTranslationLoading = false
      }
    },
    updateTranslationOptions(options) {
      this.translationOptions = options
      this.selectedTranslationIndex = 0
    },
    selectTranslation(index) {
      this.selectedTranslationIndex = index
      this.russianInput = this.translationOptions[index].text
      this.autoTranslationDone = true
      this.showMessage('Выбран вариант перевода', 'success')
    },
    focusEnglishInput() {
      const englishInputElement = this.$el.querySelector('#englishText')
      if (englishInputElement) {
        englishInputElement.focus()
      }
    },
    toggleTranslation(item) {
      const index = this.translations.findIndex(t => t.id === item.id)
      if (index === -1 || this.translations[index].editing) return
      
      this.showTranslationMap[item.id] = !this.showTranslationMap[item.id]
    },
    startEdit(item) {
      const index = this.translations.findIndex(t => t.id === item.id)
      if (index === -1) return
      
      this.translations[index].editing = true
      this.translations[index].editEnglish = this.translations[index].english_text
      this.translations[index].editRussian = this.translations[index].russian_translation
    },
    async saveEdit(item) {
      const index = this.translations.findIndex(t => t.id === item.id)
      if (index === -1) return
      
      const translation = this.translations[index]
      
      try {
        const body = { 
          englishText: translation.editEnglish.trim(), 
          russianTranslation: translation.editRussian.trim(), 
          username: this.currentUsername 
        }

        const response = await fetch(`${this.apiBaseUrl}/update-translation/${translation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (response.ok) {
          translation.english_text = translation.editEnglish.trim()
          translation.russian_translation = translation.editRussian.trim()
          
          translation.editing = false
          delete translation.editEnglish
          delete translation.editRussian
          
          if (this.updateTranslationsCount) {
            this.updateTranslationsCount()
          }
        } else {
          const errorData = await response.json()
          alert(`Ошибка при обновлении: ${errorData.error}`)
        }
      } catch (error) {
        console.error('Ошибка при обновлении:', error)
        alert('Ошибка при обновлении')
      }
    },
    cancelEdit(item) {
      const index = this.translations.findIndex(t => t.id === item.id)
      if (index === -1) return
      
      const translation = this.translations[index]
      
      translation.editing = false
      delete translation.editEnglish
      delete translation.editRussian
    },
    confirmDelete(item) {
      this.itemToDelete = item
      this.showDeleteModal = true
    },
    closeDeleteModal() {
      this.showDeleteModal = false
      this.itemToDelete = null
    },
    async deleteItem() {
      if (!this.itemToDelete) return

      try {
        const response = await fetch(`${this.apiBaseUrl}/delete-translation/${this.itemToDelete.id}?username=${encodeURIComponent(this.currentUsername)}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          this.translations = this.translations.filter(t => t.id !== this.itemToDelete.id)
          
          if (this.updateTranslationsCount) {
            this.updateTranslationsCount()
          }
          
          this.closeDeleteModal()
        } else {
          const errorData = await response.json()
          alert(`Ошибка при удалении: ${errorData.error}`)
        }
      } catch (error) {
        console.error('Ошибка при удалении:', error)
        alert('Ошибка при удалении')
      }
    }
  }
}
</script>

<style scoped>
.translations-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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

.translation-input-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}

.translation-input-container input {
  flex: 1;
  padding-right: 120px;
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
  margin: 20px 0;
}

.options-label {
  display: block;
  margin-bottom: 12px;
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
  padding: 15px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.option-card.selected {
  border-color: #667eea;
  background: #edf2f7;
}

.option-text {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 5px;
}

.option-quality,
.option-source {
  font-size: 12px;
  color: #718096;
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

.translations-container {
  padding: 20px;
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
  cursor: pointer;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.item-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 15px;
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
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.item-content .russian.visible {
  opacity: 1;
  visibility: visible;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}

.item-date {
  font-size: 12px;
  color: #a0aec0;
}

.item-actions {
  display: flex;
  gap: 6px;
}

.item-action-btn {
  padding: 2px 6px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.item-action-btn.edit:hover {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.item-action-btn.delete:hover {
  background: #e53e3e;
  color: white;
  border-color: #e53e3e;
}

.item-edit {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.item-edit-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-edit-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-edit-label {
  font-size: 12px;
  color: #718096;
  font-weight: 600;
}

.item-edit-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.item-edit-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.item-edit-actions {
  display: flex;
  gap: 10px;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.save-btn {
  background: #48bb78;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  background: #e53e3e;
  color: white;
}

.cancel-btn:hover {
  background: #c53030;
  transform: translateY(-1px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 25px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal h3 {
  margin: 0 0 15px 0;
  color: #2d3748;
}

.modal p {
  margin: 0 0 20px 0;
  color: #4a5568;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-actions .cancel-btn,
.modal-actions .delete-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-actions .delete-btn {
  background: #e53e3e;
  color: white;
}

.modal-actions .delete-btn:hover {
  background: #c53030;
}

@media (max-width: 768px) {
  .translations-view {
    padding: 10px;
  }
  
  .form-container {
    padding: 20px;
  }
  
  .translations-container {
    padding: 15px;
  }
  
  .item-card {
    padding: 16px;
  }
  
  .item-content {
    font-size: 15px;
    gap: 12px;
  }
  
  .item-action-btn {
    min-width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .modal {
    width: 95%;
    max-width: none;
    margin: 20px;
    padding: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .modal-actions .cancel-btn,
  .modal-actions .delete-btn {
    width: 100%;
    padding: 14px;
    font-size: 16px;
    min-height: 44px;
  }
}
</style>

<style>
/* Темная тема */
.dark .translations-view {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
}

.dark .translations-view .container {
  background: #2d3748;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dark .translations-view .input-group label {
  color: #e2e8f0;
}

.dark .translations-view .input-group input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .translations-view .input-group input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .translations-view .translation-form {
  background: #1a202c;
}

.dark .translations-view .empty-state {
  color: #718096;
}

.dark .translations-view .item-card {
  background: #2d3748;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.dark .translations-view .item-content .english {
  color: #e2e8f0;
}

.dark .translations-view .item-content .russian {
  color: #e2e8f0;
}

.dark .translations-view .item-date {
  color: #718096;
}

.dark .translations-view .item-action-btn {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .translations-view .item-edit-input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .translations-view .item-edit-input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .translations-view .item-edit-label {
  color: #a0aec0;
}

.dark .translations-view .modal {
  background: #2d3748;
  color: #e2e8f0;
}

.dark .translations-view .modal h3 {
  color: #e2e8f0;
}

.dark .translations-view .modal p {
  color: #a0aec0;
}
</style>
