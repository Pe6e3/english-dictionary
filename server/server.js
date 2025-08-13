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

// Инициализация базы данных
const db = new sqlite3.Database(path.join(__dirname, 'english_words.db'));

// Создание таблиц
db.serialize(() => {
  // Таблица для слов
  db.run(`CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english_word TEXT UNIQUE NOT NULL,
    russian_translation TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица для фраз
  db.run(`CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english_phrase TEXT UNIQUE NOT NULL,
    russian_translation TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API для проверки существования слова
app.get('/api/check-word/:word', (req, res) => {
  const word = req.params.word.toLowerCase().trim();
  
  db.get('SELECT * FROM words WHERE LOWER(english_word) = ?', [word], (err, row) => {
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

// API для проверки существования фразы
app.get('/api/check-phrase/:phrase', (req, res) => {
  const phrase = req.params.phrase.toLowerCase().trim();
  
  db.get('SELECT * FROM phrases WHERE LOWER(english_phrase) = ?', [phrase], (err, row) => {
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

// API для добавления нового слова
app.post('/api/add-word', (req, res) => {
  const { englishWord, russianTranslation } = req.body;
  
  if (!englishWord || !russianTranslation) {
    return res.status(400).json({ error: 'Необходимо указать слово и перевод' });
  }

  db.run(
    'INSERT INTO words (english_word, russian_translation) VALUES (?, ?)',
    [englishWord.trim(), russianTranslation.trim()],
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

// API для добавления новой фразы
app.post('/api/add-phrase', (req, res) => {
  const { englishPhrase, russianTranslation } = req.body;
  
  if (!englishPhrase || !russianTranslation) {
    return res.status(400).json({ error: 'Необходимо указать фразу и перевод' });
  }

  db.run(
    'INSERT INTO phrases (english_phrase, russian_translation) VALUES (?, ?)',
    [englishPhrase.trim(), russianTranslation.trim()],
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

// API для получения всех слов
app.get('/api/words', (req, res) => {
  db.all('SELECT * FROM words ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении слов' });
    }
    res.json(rows);
  });
});

// API для получения всех фраз
app.get('/api/phrases', (req, res) => {
  db.all('SELECT * FROM phrases ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении фраз' });
    }
    res.json(rows);
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => {
    console.log('База данных закрыта');
    process.exit(0);
  });
});
