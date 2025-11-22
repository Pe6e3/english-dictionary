<template>
  <div class="dictionary-view">
    <div class="container">
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
          <span class="stat-badge">{{ allItems.length }}</span>
          <span class="stat-label">всего</span>
        </div>
      </div>

      <!-- Таблица слов/фраз -->
      <div class="table-container">
        <div v-if="filteredItems.length === 0" class="empty-state">
          {{ searchQuery ? 'Ничего не найдено' : 'Пока ничего не добавлено' }}
        </div>
        <div v-else>
          <!-- Десктопная таблица -->
          <div class="table desktop-table">
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
                  <span class="text-content">{{ item.english_word || item.english_phrase }}</span>
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
                    placeholder="Слово или фраза"
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

          <!-- Мобильные карточки -->
          <div class="mobile-cards">
            <div 
              v-for="item in filteredItems" 
              :key="item.id" 
              class="mobile-card"
            >
              <!-- Режим просмотра -->
              <div v-if="!item.editing" class="card-content">
                <div 
                  class="card-main"
                  @mousedown="showTranslation(item)"
                  @mouseup="hideTranslation(item)"
                  @touchstart="showTranslation(item)"
                  @touchend="hideTranslation(item)"
                  @mouseleave="hideTranslation(item)"
                >
                  <div class="card-english">
                    <span class="card-text">{{ item.english_word || item.english_phrase }}</span>
                  </div>
                  <div 
                    class="card-russian"
                    :class="{ 'visible': item.showTranslation }"
                  >
                    <span class="card-text">{{ item.russian_translation }}</span>
                  </div>
                </div>
                <div class="card-footer">
                  <span class="card-date">{{ formatDate(item.created_at) }}</span>
                  <div class="card-actions">
                    <button 
                      class="action-btn edit"
                      @click.stop="startEdit(item)"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      class="action-btn delete"
                      @click.stop="confirmDelete(item)"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              <!-- Режим редактирования -->
              <div v-else class="card-edit">
                <div class="card-edit-inputs">
                  <div class="card-edit-group">
                    <label class="card-edit-label">Слово или фраза</label>
                    <input
                      v-model="item.editEnglish"
                      type="text"
                      class="card-edit-input"
                      placeholder="Слово или фраза"
                    />
                  </div>
                  <div class="card-edit-group">
                    <label class="card-edit-label">Перевод</label>
                    <input
                      v-model="item.editRussian"
                      type="text"
                      class="card-edit-input"
                      placeholder="Перевод"
                    />
                  </div>
                </div>
                <div class="card-edit-actions">
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
      </div>

      <!-- Пагинация (если нужно) -->
      <div v-if="filteredItems.length > 20" class="pagination">
        <span class="pagination-info">
          Показано {{ filteredItems.length }} из {{ allItems.length }}
        </span>
      </div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal" @click.stop>
        <h3>Подтверждение удаления</h3>
        <p>Удалить "{{ itemToDelete ? (itemToDelete.english_word || itemToDelete.english_phrase) : '' }}"?</p>
        <div class="modal-actions">
          <button class="cancel-btn" @click="closeDeleteModal">Отмена</button>
          <button class="delete-btn" @click="deleteItem">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authService } from '@/utils/auth'

export default {
  name: 'DictionaryView',
  data() {
    return {
      words: [],
      phrases: [],
      searchQuery: '',
      showDeleteModal: false,
      itemToDelete: null,
      showTranslationMap: {} // Хранит состояние показа перевода для каждого элемента
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
    },
    allItems() {
      // Объединяем слова и фразы в один массив
      const wordsWithType = this.words.map(item => ({ 
        ...item, 
        itemType: 'word',
        showTranslation: this.showTranslationMap[item.id] || false
      }))
      const phrasesWithType = this.phrases.map(item => ({ 
        ...item, 
        itemType: 'phrase',
        showTranslation: this.showTranslationMap[item.id] || false
      }))
      return [...wordsWithType, ...phrasesWithType]
    },
    filteredItems() {
      if (!this.searchQuery.trim()) return this.allItems
      
      const query = this.searchQuery.toLowerCase()
      return this.allItems.filter(item => {
        const english = item.english_word || item.english_phrase
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
          fetch(`${this.apiBaseUrl}/words?username=${encodeURIComponent(this.currentUsername)}`),
          fetch(`${this.apiBaseUrl}/phrases?username=${encodeURIComponent(this.currentUsername)}`)
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

    showTranslation(item) {
      this.showTranslationMap[item.id] = true
    },
    
    hideTranslation(item) {
      this.showTranslationMap[item.id] = false
    },
    
    startEdit(item) {
      // Создаем копии для редактирования
      item.editing = true
      item.editEnglish = item.english_word || item.english_phrase
      item.editRussian = item.russian_translation
    },

    async saveEdit(item) {
      try {
        const endpoint = item.itemType === 'word' ? 'update-word' : 'update-phrase'
        const body = item.itemType === 'word' 
          ? { englishWord: item.editEnglish.trim(), russianTranslation: item.editRussian.trim(), username: this.currentUsername }
          : { englishPhrase: item.editEnglish.trim(), russianTranslation: item.editRussian.trim(), username: this.currentUsername }

        const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (response.ok) {
          // Обновляем данные в локальном массиве
          if (item.itemType === 'word') {
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
        const endpoint = this.itemToDelete.itemType === 'word' ? 'delete-word' : 'delete-phrase'
        const response = await fetch(`${this.apiBaseUrl}/${endpoint}/${this.itemToDelete.id}?username=${encodeURIComponent(this.currentUsername)}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // Удаляем из локального массива
          if (this.itemToDelete.itemType === 'word') {
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

/* Мобильные карточки - скрыты по умолчанию */
.mobile-cards {
  display: none;
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

/* Стили для мобильных карточек */
.mobile-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.2s ease;
}

.mobile-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-content {
  padding: 16px;
}

.card-main {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  min-height: 60px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.card-main:active {
  background-color: rgba(102, 126, 234, 0.1);
}

.card-english {
  flex: 1;
  display: flex;
  align-items: center;
}

.card-russian {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.card-russian.visible {
  opacity: 1;
  visibility: visible;
}

.card-text {
  font-size: 16px;
  color: #2d3748;
  font-weight: 600;
  word-break: break-word;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.card-date {
  font-size: 12px;
  color: #a0aec0;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions .action-btn {
  padding: 8px 12px;
  font-size: 16px;
  min-width: 44px;
  min-height: 44px;
}

/* Режим редактирования в карточке */
.card-edit {
  padding: 16px;
}

.card-edit-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.card-edit-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-edit-label {
  font-size: 12px;
  color: #718096;
  font-weight: 600;
}

.card-edit-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.card-edit-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.card-edit-actions {
  display: flex;
  gap: 10px;
}

.card-edit-actions .save-btn,
.card-edit-actions .cancel-btn {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  min-height: 44px;
}

@media (max-width: 768px) {
  .dictionary-view {
    padding: 10px;
  }
  
  .header-row {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
    padding: 15px;
  }
  
  .search-container {
    max-width: none;
  }
  
  .search-input {
    font-size: 16px; /* Предотвращает зум на iOS */
    padding: 12px 15px;
  }
  
  .stats-compact {
    justify-content: center;
  }
  
  .table-container {
    padding: 0;
    overflow-x: visible;
  }
  
  /* Скрываем десктопную таблицу на мобильных */
  .desktop-table {
    display: none;
  }
  
  /* Показываем мобильные карточки */
  .mobile-cards {
    display: block;
    padding: 15px;
  }
  
  .action-btn {
    padding: 8px 12px;
    font-size: 16px;
    min-width: 44px;
    min-height: 44px;
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

@media (max-width: 480px) {
  .dictionary-view {
    padding: 5px;
  }
  
  .container {
    border-radius: 15px;
  }
  
  .header-row {
    padding: 12px;
  }
  
  .mobile-cards {
    padding: 12px;
  }
  
  .mobile-card {
    margin-bottom: 10px;
  }
  
  .card-content,
  .card-edit {
    padding: 12px;
  }
  
  .card-text {
    font-size: 15px;
  }
  
  .card-actions .action-btn {
    padding: 10px;
    font-size: 18px;
  }
}

</style>

<style>
/* Темная тема */
.dark .dictionary-view {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
}

.dark .dictionary-view .container {
  background: #2d3748;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dark .dictionary-view .header-row {
  background: #1a202c;
  border-bottom-color: #4a5568;
}

.dark .dictionary-view .search-input {
  background: #2d3748;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .search-input:focus {
  border-color: #667eea;
  background: #2d3748;
}

.dark .dictionary-view .stat-label {
  color: #a0aec0;
}

.dark .dictionary-view .table-header {
  background: #1a202c;
  border-bottom-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .table-row:hover {
  background: #1a202c;
}

.dark .dictionary-view .text-content {
  color: #e2e8f0;
}

.dark .dictionary-view .date-text {
  color: #718096;
}

.dark .dictionary-view .edit-input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .edit-input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .dictionary-view .action-btn {
  background: #2d3748;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .empty-state {
  color: #718096;
}

.dark .dictionary-view .mobile-card {
  background: #2d3748;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.dark .dictionary-view .card-text {
  color: #e2e8f0;
}

.dark .dictionary-view .card-main:active {
  background-color: rgba(102, 126, 234, 0.2);
}

.dark .dictionary-view .card-label {
  color: #a0aec0;
}

.dark .dictionary-view .card-date {
  color: #718096;
}

.dark .dictionary-view .card-edit-input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .card-edit-input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .dictionary-view .card-edit-label {
  color: #a0aec0;
}

.dark .dictionary-view .modal {
  background: #2d3748;
  color: #e2e8f0;
}

.dark .dictionary-view .modal h3 {
  color: #e2e8f0;
}

.dark .dictionary-view .modal p {
  color: #a0aec0;
}
</style>
