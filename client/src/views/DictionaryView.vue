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

      <!-- Поиск и статистика -->
      <div class="header-row">
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по словарю..."
            class="search-input"
          />
        </div>
        <div class="stats-compact">
          <span class="stat-badge">{{ words.length + phrases.length }}</span>
          <span class="stat-label">всего</span>
        </div>
      </div>

      <!-- Таблица слов/фраз -->
      <div class="table-container">
        <div v-if="filteredItems.length === 0" class="empty-state">
          {{ searchQuery ? 'Ничего не найдено' : 'Пока ничего не добавлено' }}
        </div>
        <div v-else class="table">
          <!-- Заголовок таблицы -->
          <div class="table-header">
            <div class="col-english">Английский</div>
            <div class="col-arrow">→</div>
            <div class="col-russian">Русский перевод</div>
            <div class="col-date">Дата</div>
            <div class="col-actions">Действия</div>
          </div>
          
          <!-- Строки таблицы -->
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="table-row"
          >
            <!-- Режим просмотра -->
            <div v-if="!item.editing" class="row-content">
              <div class="col-english">
                <span class="text-content">{{ mode === 'word' ? item.english_word : item.english_phrase }}</span>
              </div>
              <div class="col-arrow">→</div>
              <div class="col-russian">
                <span class="text-content">{{ item.russian_translation }}</span>
              </div>
              <div class="col-date">
                <span class="date-text">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="col-actions">
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

            <!-- Режим редактирования -->
            <div v-else class="edit-row">
              <div class="col-english">
                <input
                  v-model="item.editEnglish"
                  type="text"
                  class="edit-input"
                  :placeholder="mode === 'word' ? 'Слово' : 'Фраза'"
                />
              </div>
              <div class="col-arrow">→</div>
              <div class="col-russian">
                <input
                  v-model="item.editRussian"
                  type="text"
                  class="edit-input"
                  placeholder="Перевод"
                />
              </div>
              <div class="col-date">
                <span class="date-text">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="col-actions">
                <button 
                  class="save-btn"
                  @click="saveEdit(item)"
                  :disabled="!item.editEnglish.trim() || !item.editRussian.trim()"
                  title="Сохранить"
                >
                  💾
                </button>
                <button 
                  class="cancel-btn"
                  @click="cancelEdit(item)"
                  title="Отмена"
                >
                  ❌
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Пагинация (если нужно) -->
      <div v-if="filteredItems.length > 20" class="pagination">
        <span class="pagination-info">
          Показано {{ filteredItems.length }} из {{ (mode === 'word' ? words : phrases).length }}
        </span>
      </div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal" @click.stop>
        <h3>Подтверждение удаления</h3>
        <p>Удалить "{{ itemToDelete ? (mode === 'word' ? itemToDelete.english_word : itemToDelete.english_phrase) : '' }}"?</p>
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
            item.english_phrase = item.editEnglish.trim()
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
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.title {
  text-align: center;
  color: white;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  padding: 30px 20px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.toggle-container {
  display: flex;
  background: #f7fafc;
  padding: 15px 20px;
  gap: 10px;
}

.toggle-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
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
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.toggle-btn:hover:not(.active) {
  background: #edf2f7;
  transform: translateY(-1px);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-container {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.stats-compact {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 16px;
}

.stat-label {
  color: #718096;
  font-size: 14px;
}

.table-container {
  padding: 0;
  overflow-x: auto;
}

.empty-state {
  text-align: center;
  color: #718096;
  font-style: italic;
  padding: 40px;
}

.table {
  width: 100%;
  min-width: 800px;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 0.5fr 2fr 1fr 1fr;
  gap: 15px;
  padding: 15px 20px;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #4a5568;
  font-size: 14px;
}

.table-row {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-row:hover {
  background: #f8fafc;
}

.row-content,
.edit-row {
  display: grid;
  grid-template-columns: 2fr 0.5fr 2fr 1fr 1fr;
  gap: 15px;
  padding: 12px 20px;
  align-items: center;
}

.col-english,
.col-russian {
  min-width: 0;
}

.text-content {
  font-size: 14px;
  color: #2d3748;
  font-weight: 500;
  word-break: break-word;
  line-height: 1.4;
}

.col-arrow {
  text-align: center;
  color: #a0aec0;
  font-weight: bold;
  font-size: 16px;
}

.col-date {
  text-align: center;
}

.date-text {
  font-size: 12px;
  color: #a0aec0;
  font-weight: 500;
}

.col-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.action-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
}

.action-btn.edit:hover {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.action-btn.delete:hover {
  background: #e53e3e;
  color: white;
  border-color: #e53e3e;
}

/* Режим редактирования */
.edit-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.edit-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.save-btn,
.cancel-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
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

/* Пагинация */
.pagination {
  padding: 15px 20px;
  text-align: center;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  color: #718096;
  font-size: 14px;
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

/* Адаптивность */
@media (max-width: 1200px) {
  .container {
    margin: 10px;
    border-radius: 15px;
  }
  
  .title {
    font-size: 2rem;
    padding: 25px 15px 15px;
  }
  
  .table-header,
  .row-content,
  .edit-row {
    grid-template-columns: 2fr 0.5fr 2fr 1fr 1fr;
    gap: 10px;
    padding: 10px 15px;
  }
  
  .text-content,
  .edit-input {
    font-size: 13px;
  }
  
  .action-btn {
    padding: 5px 8px;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .dictionary-view {
    padding: 10px;
  }
  
  .header-row {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .search-container {
    max-width: none;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .table {
    min-width: 600px;
  }
  
  .table-header,
  .row-content,
  .edit-row {
    grid-template-columns: 2fr 0.5fr 2fr 1fr 1fr;
    gap: 8px;
    padding: 8px 12px;
  }
  
  .text-content,
  .edit-input {
    font-size: 12px;
  }
  
  .action-btn {
    padding: 4px 6px;
    font-size: 12px;
  }
  
  .col-actions {
    gap: 4px;
  }
}
</style>
сде