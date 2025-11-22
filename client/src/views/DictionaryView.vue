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

      <!-- Карточки переводов -->
      <div class="translations-container">
        <div v-if="filteredItems.length === 0" class="empty-state">
          {{ searchQuery ? 'Ничего не найдено' : 'Пока ничего не добавлено' }}
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
        <p>Удалить "{{ itemToDelete ? itemToDelete.english_text : '' }}"?</p>
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
      translations: [],
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
      // Добавляем состояние показа перевода к каждому элементу
      return this.translations.map(item => ({ 
        ...item, 
        showTranslation: this.showTranslationMap[item.id] || false
      }))
    },
    filteredItems() {
      if (!this.searchQuery.trim()) return this.allItems
      
      const query = this.searchQuery.toLowerCase()
      return this.allItems.filter(item => {
        const english = item.english_text
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
        const response = await fetch(`${this.apiBaseUrl}/translations?username=${encodeURIComponent(this.currentUsername)}`)
        
        if (response.ok) {
          this.translations = await response.json()
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error)
      }
    },

    toggleTranslation(item) {
      if (!item.editing) {
        this.showTranslationMap[item.id] = !this.showTranslationMap[item.id]
      }
    },
    
    startEdit(item) {
      // Создаем копии для редактирования
      item.editing = true
      item.editEnglish = item.english_text
      item.editRussian = item.russian_translation
    },

    async saveEdit(item) {
      try {
        const body = { 
          englishText: item.editEnglish.trim(), 
          russianTranslation: item.editRussian.trim(), 
          username: this.currentUsername 
        }

        const response = await fetch(`${this.apiBaseUrl}/update-translation/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (response.ok) {
          // Обновляем данные в локальном массиве
          item.english_text = item.editEnglish.trim()
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
        const response = await fetch(`${this.apiBaseUrl}/delete-translation/${this.itemToDelete.id}?username=${encodeURIComponent(this.currentUsername)}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // Удаляем из локального массива
          this.translations = this.translations.filter(t => t.id !== this.itemToDelete.id)
          
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
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
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

/* Режим редактирования */
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
@media (max-width: 768px) {
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

.dark .dictionary-view .empty-state {
  color: #718096;
}

.dark .dictionary-view .item-card {
  background: #2d3748;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.dark .dictionary-view .item-content .english {
  color: #e2e8f0;
}

.dark .dictionary-view .item-content .russian {
  color: #e2e8f0;
}

.dark .dictionary-view .item-date {
  color: #718096;
}

.dark .dictionary-view .item-action-btn {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .item-edit-input {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark .dictionary-view .item-edit-input:focus {
  border-color: #667eea;
  background: #1a202c;
}

.dark .dictionary-view .item-edit-label {
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
