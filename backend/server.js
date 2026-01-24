const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend')); // Раздаем статические файлы

// Подключение к БД
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'climate_service',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ============ API МАРШРУТЫ ============

// 1. Вход в систему
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE login = $1 AND password = $2',
      [login, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    const user = result.rows[0];
    
    // Убираем пароль из ответа
    delete user.password;
    
    res.json({ 
      success: true, 
      user,
      token: 'demo-token-' + user.user_id 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. Получить все заявки
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             c.fio as client_name,
             m.fio as master_name
      FROM requests r
      LEFT JOIN users c ON r.client_id = c.user_id
      LEFT JOIN users m ON r.master_id = m.user_id
      ORDER BY r.request_id DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. Получить заявку по ID
app.get('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             c.fio as client_name,
             m.fio as master_name
      FROM requests r
      LEFT JOIN users c ON r.client_id = c.user_id
      LEFT JOIN users m ON r.master_id = m.user_id
      WHERE r.request_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 4. Создать новую заявку
app.post('/api/requests', async (req, res) => {
  try {
    const { client_id, climate_tech_type, climate_tech_model, problem_description } = req.body;
    
    const result = await pool.query(
      `INSERT INTO requests 
       (client_id, climate_tech_type, climate_tech_model, problem_description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [client_id, climate_tech_type, climate_tech_model, problem_description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 5. Обновить заявку
app.put('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { request_status, master_id } = req.body;
    
    const result = await pool.query(
      `UPDATE requests 
       SET request_status = $1, 
           master_id = $2,
           completion_date = CASE 
             WHEN $1 = 'completed' THEN CURRENT_DATE 
             ELSE completion_date 
           END
       WHERE request_id = $3 
       RETURNING *`,
      [request_status, master_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 6. Получить статистику
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Количество выполненных заявок
    const completed = await pool.query(
      "SELECT COUNT(*) as count FROM requests WHERE request_status = 'completed'"
    );
    stats.completed = parseInt(completed.rows[0].count);
    
    // Заявки по статусам
    const byStatus = await pool.query(`
      SELECT request_status, COUNT(*) as count
      FROM requests
      GROUP BY request_status
      ORDER BY request_status
    `);
    stats.by_status = byStatus.rows;
    
    // Специалисты
    const specialists = await pool.query(`
      SELECT u.fio, COUNT(r.request_id) as active_requests
      FROM users u
      LEFT JOIN requests r ON u.user_id = r.master_id 
        AND r.request_status != 'completed'
      WHERE u.role = 'specialist'
      GROUP BY u.user_id, u.fio
    `);
    stats.specialists = specialists.rows;
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 7. Получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, fio, phone, login, user_type, role FROM users ORDER BY user_id"
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 8. Проверка здоровья
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Climate Service API работает',
    timestamp: new Date().toISOString()
  });
});

// Раздаем фронтенд
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: '../frontend' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Фронтенд: http://localhost:${PORT}`);
  console.log('🔑 Демо доступы:');
  console.log('   Менеджер: login1 / pass1');
  console.log('   Специалист: login2 / pass2');
  console.log('   Заказчик: login6 / pass6');
});