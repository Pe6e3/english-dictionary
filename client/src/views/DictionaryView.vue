<template>
  <div class="dictionary-view">
    <div class="container">
      <h1 class="title">Словарь английских слов</h1>
      
      <!-- Переключатель между словами и фразами -->
      <div class="toggle-container">
        <button 
          :class="['toggle-btn', { active: mode === 'word' }]"
          @click="mode = 'word'"
        >
          Слова ({{ words.length }})
        </button>
        <button 
          :class="['toggle-btn', { active: mode === 'phrase' }]"
          @click="mode = 'phrase'"
        >
          Фразы ({{ phrases.length }})
        </button>
      </div>

      <!-- Поиск -->
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по словарю..."
          class="search-input"
        />
      </div>

      <!-- Список слов/фраз -->
      <div class="dictionary-list">
        <div v-if="filteredItems.length === 0" class="empty-state">
          {{ searchQuery ? 'Ничего не найдено' : 'Пока ничего не добавлено' }}
        </div>
        <div v-else class="items-grid">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="item-card"
          >
            <!-- Режим просмотра -->
            <div v-if="!item.editing" class="item-content">
              <div class="item-main">
                <span class="english">{{ mode === 'word' ? item.english_word : item.english_phrase }}</span>
                <span class="arrow">→</span>
                <span class="russian">{{ item.russian_translation }}</span>
              </div>
              <div class="item-meta">
                <span class="date">{{ formatDate(item.created_at) }}</span>
                <div class="actions">
                  <button 
                    class="action-btn edit"
                    @click="startEdit(item)"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button 
                    class="action-btn delete"
                    @click="confirmDelete(item)"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <!-- Режим редактирования -->
            <div v-else class="edit-form">
              <div class="edit-inputs">
                <input
                  v-model="item.editEnglish"
                  type="text"
                  class="edit-input"
                  :placeholder="mode === 'word' ? 'Английское слово' : 'Английская фраза'"
                />
                <span class="arrow">→</span>
                <input
                  v-model="item.editRussian"
                  type="text"
                  class="edit-input"
                  placeholder="Русский перевод"
                />
              </div>
              <div class="edit-actions">
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

      <!-- Статистика -->
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Всего слов:</span>
          <span class="stat-value">{{ words.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Всего фраз:</span>
          <span class="stat-value">{{ phrases.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Всего записей:</span>
          <span class="stat-value">{{ words.length + phrases.length }}</span>
        </div>
      </div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal" @click.stop>
        <h3>Подтверждение удаления</h3>
        <p>Вы уверены, что хотите удалить "{{ itemToDelete ? (mode === 'word' ? itemToDelete.english_word : itemToDelete.english_phrase) : '' }}"?</p>
        <div class="modal-actions">
          <button class="cancel-btn" @click="closeDeleteModal">Отмена</button>
          <button class="delete-btn" @click="deleteItem">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DictionaryView',
  data() {
    return {
      mode: 'word', // 'word' или 'phrase'
      words: [],
      phrases: [],
      searchQuery: '',
      showDeleteModal: false,
      itemToDelete: null
    }
  },
  computed: {
    apiBaseUrl() {
      return 'http://localhost:3002/api'
    },
    filteredItems() {
      const items = this.mode === 'word' ? this.words : this.phrases
      if (!this.searchQuery.trim()) return items
      
      const query = this.searchQuery.toLowerCase()
      return items.filter(item => {
        const english = this.mode === 'word' ? item.english_word : item.english_phrase
        return english.toLowerCase().includes(query) || 
               item.russian_translation.toLowerCase().includes(query)
      })
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        // Загружаем слова и фразы параллельно
        const [wordsResponse, phrasesResponse] = await Promise.all([
          fetch(`${this.apiBaseUrl}/words`),
          fetch(`${this.apiBaseUrl}/phrases`)
        ])

        if (wordsResponse.ok) {
          this.words = await wordsResponse.json()
        }
        if (phrasesResponse.ok) {
          this.phrases = await phrasesResponse.json()
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error)
      }
    },

    startEdit(item) {
      // Создаем копии для редактирования
      item.editing = true
      item.editEnglish = this.mode === 'word' ? item.english_word : item.english_phrase
      item.editRussian = item.russian_translation
    },

    async saveEdit(item) {
      try {
        const endpoint = this.mode === 'word' ? 'update-word' : 'update-phrase'
        const body = this.mode === 'word' 
          ? { englishWord: item.editEnglish.trim(), russianTranslation: item.editRussian.trim() }
          : { englishPhrase: item.editEnglish.trim(), russianTranslation: item.editRussian.trim() }

        const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (response.ok) {
          // Обновляем данные в локальном массиве
          if (this.mode === 'word') {
            item.english_word = item.editEnglish.trim()
          } else {
            item.english_phrase = item.editRussian.trim()
          }
          item.russian_translation = item.editRussian.trim()
          
          // Выходим из режима редактирования
          item.editing = false
          delete item.editEnglish
          delete item.editRussian
          delete item.editing
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
      // Отменяем редактирование
      item.editing = false
      delete item.editEnglish
      delete item.editRussian
      delete item.editing
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
        const endpoint = this.mode === 'word' ? 'delete-word' : 'delete-phrase'
        const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${this.itemToDelete.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // Удаляем из локального массива
          if (this.mode === 'word') {
            this.words = this.words.filter(w => w.id !== this.itemToDelete.id)
          } else {
            this.phrases = this.phrases.filter(p => p.id !== this.itemToDelete.id)
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
    }
  },
  watch: {
    mode() {
      this.searchQuery = ''
    }
  }
}
</script>

<style scoped>
.dictionary-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.container {
  max-width: 1200px;
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

.search-container {
  padding: 20px;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  width: 100%;
  padding: 15px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.dictionary-list {
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
  border: 1px solid #e2e8f0;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 18px;
}

.english {
  font-weight: 600;
  color: #2d3748;
}

.arrow {
  color: #718096;
  font-weight: bold;
  font-size: 20px;
}

.russian {
  font-weight: 600;
  color: #4a5568;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date {
  font-size: 12px;
  color: #a0aec0;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  background: #f7fafc;
}

.action-btn.edit:hover {
  background: #4299e1;
  color: white;
}

.action-btn.delete:hover {
  background: #e53e3e;
  color: white;
}

/* Режим редактирования */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.edit-inputs {
  display: flex;
  align-items: center;
  gap: 15px;
}

.edit-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.edit-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.edit-actions {
  display: flex;
  gap: 10px;
}

.save-btn,
.cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
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

/* Статистика */
.stats {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #718096;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2d3748;
}

/* Модальное окно */
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
  padding: 30px;
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
  .container {
    margin: 10px;
    border-radius: 15px;
  }
  
  .title {
    font-size: 2rem;
    padding: 30px 15px 15px;
  }
  
  .item-main {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .item-meta {
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }
  
  .edit-inputs {
    flex-direction: column;
    gap: 10px;
  }
  
  .stats {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
