const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware для получения user_id из username
const getUserById = (username, callback) => {
  db.get('SELECT id FROM users WHERE username = ?', [username], callback);
};

// Инициализация базы данных
const db = new sqlite3.Database(path.join(__dirname, 'english_words.db'));

// Создание таблиц
db.serialize(() => {
  // Таблица для пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица для слов
  db.run(`CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english_word TEXT NOT NULL,
    russian_translation TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(english_word, user_id)
  )`);

  // Таблица для фраз
  db.run(`CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english_phrase TEXT NOT NULL,
    russian_translation TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(english_phrase, user_id)
  )`);

  // Добавляем поле user_id если таблицы уже существовали
  db.run(`ALTER TABLE words ADD COLUMN user_id INTEGER`, (err) => {
    // Игнорируем ошибку если колонка уже существует
  });
  
  db.run(`ALTER TABLE phrases ADD COLUMN user_id INTEGER`, (err) => {
    // Игнорируем ошибку если колонка уже существует
  });

  // Создаем пользователей по умолчанию
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('anton', '12345678')`);
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('fedor', '12345678')`);

  // Миграция: привязываем существующие переводы к пользователю anton
  db.get(`SELECT id FROM users WHERE username = 'anton'`, (err, user) => {
    if (!err && user) {
      db.run(`UPDATE words SET user_id = ? WHERE user_id IS NULL`, [user.id]);
      db.run(`UPDATE phrases SET user_id = ? WHERE user_id IS NULL`, [user.id]);
    }
  });
});

// API для проверки существования слова
app.get('/api/check-word/:word', (req, res) => {
  const word = req.params.word.toLowerCase().trim();
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    db.get('SELECT * FROM words WHERE LOWER(english_word) = ? AND user_id = ?', [word, user.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка базы данных' });
      }
      
      if (row) {
        res.json({ 
          exists: true, 
          word: row.english_word, 
          translation: row.russian_translation 
        });
      } else {
        res.json({ exists: false });
      }
    });
  });
});

// API для проверки существования фразы
app.get('/api/check-phrase/:phrase', (req, res) => {
  const phrase = req.params.phrase.toLowerCase().trim();
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    db.get('SELECT * FROM phrases WHERE LOWER(english_phrase) = ? AND user_id = ?', [phrase, user.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка базы данных' });
      }
      
      if (row) {
        res.json({ 
          exists: true, 
          phrase: row.english_phrase, 
          translation: row.russian_translation 
        });
      } else {
        res.json({ exists: false });
      }
    });
  });
});

// API для добавления нового слова
app.post('/api/add-word', (req, res) => {
  const { englishWord, russianTranslation, username } = req.body;
  
  if (!englishWord || !russianTranslation || !username) {
    return res.status(400).json({ error: 'Необходимо указать слово, перевод и username' });
  }

  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    db.run(
      'INSERT INTO words (english_word, russian_translation, user_id) VALUES (?, ?, ?)',
      [englishWord.trim(), russianTranslation.trim(), user.id],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Такое слово уже существует' });
          }
          return res.status(500).json({ error: 'Ошибка при добавлении слова' });
        }
        
        res.json({ 
          success: true, 
          id: this.lastID,
          message: 'Слово успешно добавлено' 
        });
      }
    );
  });
});

// API для добавления новой фразы
app.post('/api/add-phrase', (req, res) => {
  const { englishPhrase, russianTranslation, username } = req.body;
  
  if (!englishPhrase || !russianTranslation || !username) {
    return res.status(400).json({ error: 'Необходимо указать фразу, перевод и username' });
  }

  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    db.run(
      'INSERT INTO phrases (english_phrase, russian_translation, user_id) VALUES (?, ?, ?)',
      [englishPhrase.trim(), russianTranslation.trim(), user.id],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Такая фраза уже существует' });
          }
          return res.status(500).json({ error: 'Ошибка при добавлении фразы' });
        }
        
        res.json({ 
          success: true, 
          id: this.lastID,
          message: 'Фраза успешно добавлена' 
        });
      }
    );
  });
});

// API для обновления слова
app.put('/api/update-word/:id', (req, res) => {
  const { id } = req.params;
  const { englishWord, russianTranslation, username } = req.body;
  
  if (!englishWord || !russianTranslation || !username) {
    return res.status(400).json({ error: 'Необходимо указать слово, перевод и username' });
  }

  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    db.run(
      'UPDATE words SET english_word = ?, russian_translation = ? WHERE id = ? AND user_id = ?',
      [englishWord.trim(), russianTranslation.trim(), id, user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при обновлении слова' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Слово не найдено' });
        }
        
        res.json({ 
          success: true, 
          message: 'Слово успешно обновлено' 
        });
      }
    );
  });
});

// API для обновления фразы
app.put('/api/update-phrase/:id', (req, res) => {
  const { id } = req.params;
  const { englishPhrase, russianTranslation, username } = req.body;
  
  if (!englishPhrase || !russianTranslation || !username) {
    return res.status(400).json({ error: 'Необходимо указать фразу, перевод и username' });
  }

  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    db.run(
      'UPDATE phrases SET english_phrase = ?, russian_translation = ? WHERE id = ? AND user_id = ?',
      [englishPhrase.trim(), russianTranslation.trim(), id, user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при обновлении фразы' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Фраза не найдена' });
        }
        
        res.json({ 
          success: true, 
          message: 'Фраза успешно обновлена' 
        });
      }
    );
  });
});

// API для удаления слова
app.delete('/api/delete-word/:id', (req, res) => {
  const { id } = req.params;
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    db.run('DELETE FROM words WHERE id = ? AND user_id = ?', [id, user.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при удалении слова' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Слово не найдено' });
      }
      
      res.json({ 
        success: true, 
        message: 'Слово успешно удалено' 
      });
    });
  });
});

// API для удаления фразы
app.delete('/api/delete-phrase/:id', (req, res) => {
  const { id } = req.params;
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    db.run('DELETE FROM phrases WHERE id = ? AND user_id = ?', [id, user.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при удалении фразы' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Фраза не найдена' });
      }
      
      res.json({ 
        success: true, 
        message: 'Фраза успешно удалена' 
      });
    });
  });
});

// API для получения всех переводов (объединяет слова и фразы)
app.get('/api/translations', (req, res) => {
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    // Объединяем слова и фразы в один массив
    db.all(`
      SELECT 
        id,
        COALESCE(english_word, english_phrase) as english_text,
        russian_translation,
        created_at,
        CASE WHEN english_word IS NOT NULL THEN 'word' ELSE 'phrase' END as type
      FROM (
        SELECT id, english_word, NULL as english_phrase, russian_translation, created_at
        FROM words
        WHERE user_id = ?
        UNION ALL
        SELECT id, NULL as english_word, english_phrase, russian_translation, created_at
        FROM phrases
        WHERE user_id = ?
      )
      ORDER BY created_at DESC
    `, [user.id, user.id], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении переводов' });
      }
      res.json(rows);
    });
  });
});

// API для проверки существования перевода
app.get('/api/check-translation/:text', (req, res) => {
  const text = req.params.text.toLowerCase().trim();
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    // Проверяем в обеих таблицах
    db.get(`
      SELECT 
        COALESCE(english_word, english_phrase) as text,
        russian_translation as translation
      FROM (
        SELECT english_word, NULL as english_phrase, russian_translation
        FROM words
        WHERE LOWER(english_word) = ? AND user_id = ?
        UNION ALL
        SELECT NULL as english_word, english_phrase, russian_translation
        FROM phrases
        WHERE LOWER(english_phrase) = ? AND user_id = ?
      )
      LIMIT 1
    `, [text, user.id, text, user.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка базы данных' });
      }
      
      if (row) {
        res.json({ 
          exists: true, 
          text: row.text, 
          translation: row.translation 
        });
      } else {
        res.json({ exists: false });
      }
    });
  });
});

// API для добавления нового перевода
app.post('/api/add-translation', (req, res) => {
  const { englishText, russianTranslation, username } = req.body;
  
  if (!englishText || !russianTranslation || !username) {
    return res.status(400).json({ error: 'Необходимо указать текст, перевод и username' });
  }

  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const englishTextTrimmed = englishText.trim();
    const russianTranslationTrimmed = russianTranslation.trim();
    const englishTextLower = englishTextTrimmed.toLowerCase();

    // Сначала проверяем, существует ли уже такой перевод (без учета регистра)
    db.get(`
      SELECT 
        COALESCE(english_word, english_phrase) as text,
        russian_translation as translation
      FROM (
        SELECT english_word, NULL as english_phrase, russian_translation
        FROM words
        WHERE LOWER(english_word) = ? AND user_id = ?
        UNION ALL
        SELECT NULL as english_word, english_phrase, russian_translation
        FROM phrases
        WHERE LOWER(english_phrase) = ? AND user_id = ?
      )
      LIMIT 1
    `, [englishTextLower, user.id, englishTextLower, user.id], (err, existingRow) => {
      if (err) {
        console.error('Ошибка при проверке существования перевода:', err);
        return res.status(500).json({ error: 'Ошибка при проверке перевода' });
      }

      if (existingRow) {
        return res.status(409).json({ 
          error: 'Такой перевод уже существует',
          existing: {
            text: existingRow.text,
            translation: existingRow.translation
          }
        });
      }

      // Проверяем также точное совпадение (с учетом регистра) для текущего пользователя
      // Это нужно, потому что UNIQUE constraint чувствителен к регистру
      db.get(`
        SELECT english_word
        FROM words
        WHERE english_word = ? AND user_id = ?
        LIMIT 1
      `, [englishTextTrimmed, user.id], (err2, exactMatch) => {
        if (err2) {
          console.error('Ошибка при проверке точного совпадения:', err2);
          return res.status(500).json({ error: 'Ошибка при проверке перевода' });
        }

        if (exactMatch) {
          return res.status(409).json({ 
            error: 'Такой перевод уже существует (точное совпадение)'
          });
        }

        // Если перевода нет, добавляем в words (сохраняем оригинальный регистр)
        db.run(
          'INSERT INTO words (english_word, russian_translation, user_id) VALUES (?, ?, ?)',
          [englishTextTrimmed, russianTranslationTrimmed, user.id],
          function(insertErr) {
            if (insertErr) {
              console.error('Ошибка при добавлении перевода:', insertErr);
              
              // Если ошибка UNIQUE constraint, проверяем еще раз
              if (insertErr.code === 'SQLITE_CONSTRAINT' && insertErr.message.includes('UNIQUE')) {
                // Проверяем, может быть слово уже есть с другим регистром
                db.get(`
                  SELECT english_word, russian_translation
                  FROM words
                  WHERE LOWER(english_word) = ? AND user_id = ?
                  LIMIT 1
                `, [englishTextLower, user.id], (err3, existing) => {
                  if (err3) {
                    return res.status(500).json({ error: 'Ошибка при добавлении перевода: ' + insertErr.message });
                  }
                  
                  if (existing) {
                    return res.status(409).json({ 
                      error: 'Такой перевод уже существует',
                      existing: {
                        text: existing.english_word,
                        translation: existing.russian_translation
                      }
                    });
                  }
                  
                  return res.status(500).json({ error: 'Ошибка при добавлении перевода: ' + insertErr.message });
                });
              } else {
                return res.status(500).json({ error: 'Ошибка при добавлении перевода: ' + insertErr.message });
              }
            } else {
              res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Перевод успешно добавлен' 
              });
            }
          }
        );
      });
    });
  });
});

// API для получения всех слов (для обратной совместимости)
app.get('/api/words', (req, res) => {
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    db.all('SELECT * FROM words WHERE user_id = ? ORDER BY created_at DESC', [user.id], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении слов' });
      }
      res.json(rows);
    });
  });
});

// API для получения всех фраз (для обратной совместимости)
app.get('/api/phrases', (req, res) => {
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    db.all('SELECT * FROM phrases WHERE user_id = ? ORDER BY created_at DESC', [user.id], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении фраз' });
      }
      res.json(rows);
    });
  });
});

// API для обновления перевода (работает с обеими таблицами)
app.put('/api/update-translation/:id', (req, res) => {
  const { id } = req.params;
  const { englishText, russianTranslation, username } = req.body;
  
  if (!englishText || !russianTranslation || !username) {
    return res.status(400).json({ error: 'Необходимо указать текст, перевод и username' });
  }

  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Пробуем обновить в words
    db.run(
      'UPDATE words SET english_word = ?, russian_translation = ? WHERE id = ? AND user_id = ?',
      [englishText.trim(), russianTranslation.trim(), id, user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при обновлении перевода' });
        }
        
        if (this.changes > 0) {
          return res.json({ 
            success: true, 
            message: 'Перевод успешно обновлен' 
          });
        }
        
        // Если не обновилось в words, пробуем в phrases
        db.run(
          'UPDATE phrases SET english_phrase = ?, russian_translation = ? WHERE id = ? AND user_id = ?',
          [englishText.trim(), russianTranslation.trim(), id, user.id],
          function(err2) {
            if (err2) {
              return res.status(500).json({ error: 'Ошибка при обновлении перевода' });
            }
            
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Перевод не найден' });
            }
            
            res.json({ 
              success: true, 
              message: 'Перевод успешно обновлен' 
            });
          }
        );
      }
    );
  });
});

// API для удаления перевода (работает с обеими таблицами)
app.delete('/api/delete-translation/:id', (req, res) => {
  const { id } = req.params;
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: 'Необходимо указать username' });
  }
  
  getUserById(username, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    // Пробуем удалить из words
    db.run('DELETE FROM words WHERE id = ? AND user_id = ?', [id, user.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при удалении перевода' });
      }
      
      if (this.changes > 0) {
        return res.json({ 
          success: true, 
          message: 'Перевод успешно удален' 
        });
      }
      
      // Если не удалилось из words, пробуем из phrases
      db.run('DELETE FROM phrases WHERE id = ? AND user_id = ?', [id, user.id], function(err2) {
        if (err2) {
          return res.status(500).json({ error: 'Ошибка при удалении перевода' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Перевод не найден' });
        }
        
        res.json({ 
          success: true, 
          message: 'Перевод успешно удален' 
        });
      });
    });
  });
});

// Webhook для автоматического деплоя
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'your-secret-key-change-me';

app.post('/api/deploy', (req, res) => {
  const { secret } = req.body;
  
  // Проверяем секретный ключ
  if (secret !== DEPLOY_SECRET) {
    return res.status(401).json({ error: 'Неверный секретный ключ' });
  }
  
  // Отправляем ответ сразу, не дожидаясь завершения деплоя
  res.json({ 
    success: true, 
    message: 'Деплой запущен',
    timestamp: new Date().toISOString()
  });
  
  // Запускаем деплой в фоновом режиме (после отправки ответа)
  // Используем nohup для запуска независимого процесса, который не умрет при перезапуске PM2
  const { exec } = require('child_process');
  const deployScript = '/var/www/english/auto-deploy.sh';
  const logFile = '/var/log/pm2/deploy.log';
  
  console.log(`[${new Date().toISOString()}] Запуск деплоя через webhook...`);
  
  // Добавляем задержку перед запуском деплоя, чтобы дать время GitHub синхронизировать изменения
  // Запускаем через nohup в фоне с задержкой, перенаправляя вывод в лог
  const DELAY_SECONDS = 10; // Увеличена задержка до 10 секунд для надежности
  const command = `(sleep ${DELAY_SECONDS} && bash ${deployScript}) >> ${logFile} 2>&1 &`;
  
  exec(command, (error) => {
    if (error) {
      console.error(`[${new Date().toISOString()}] Ошибка запуска деплоя:`, error);
      return;
    }
    console.log(`[${new Date().toISOString()}] Деплой запланирован (запуск через ${DELAY_SECONDS} секунд). Логи: ${logFile}`);
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Доступен по адресу: http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => {
    console.log('База данных закрыта');
    process.exit(0);
  });
});
