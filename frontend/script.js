// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// Обновление меню пользователя
function updateUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // Перевод ролей
    const roleNames = {
        'manager': 'Менеджер',
        'specialist': 'Специалист',
        'client': 'Заказчик',
        'operator': 'Оператор'
    };
    
    userMenu.innerHTML = `
        <span>${user.fio}</span>
        <span class="badge badge-info">${roleNames[user.role] || user.role}</span>
        <button onclick="logout()" class="btn btn-secondary btn-sm">
            <i class="fas fa-sign-out-alt"></i> Выйти
        </button>
    `;
}

// Выход из системы
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Загрузка статистики
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            const stats = await response.json();
            displayStats(stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Отображение статистики
function displayStats(stats) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
                <h3>Выполнено заявок</h3>
                <div class="stat-number">${stats.completed || 0}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-hourglass-half"></i>
            </div>
            <div class="stat-content">
                <h3>Активных заявок</h3>
                <div class="stat-number">${stats.by_status?.find(s => s.request_status !== 'completed')?.count || 0}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
                <h3>Специалистов</h3>
                <div class="stat-number">${stats.specialists?.length || 0}</div>
            </div>
        </div>
    `;
}

// Загрузка последних заявок
async function loadRecentRequests() {
    try {
        const response = await fetch('/api/requests');
        if (response.ok) {
            const requests = await response.json();
            displayRecentRequests(requests.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

// Отображение последних заявок
function displayRecentRequests(requests) {
    const requestsList = document.getElementById('requests-list');
    if (!requestsList) return;
    
    if (requests.length === 0) {
        requestsList.innerHTML = '<p class="text-center">Нет заявок</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table"><tbody>';
    
    requests.forEach(request => {
        const statusClass = getStatusClass(request.request_status);
        const statusText = getStatusText(request.request_status);
        
        html += `
            <tr>
                <td>#${request.request_id}</td>
                <td>${new Date(request.start_date).toLocaleDateString('ru-RU')}</td>
                <td>${request.climate_tech_type}</td>
                <td>${request.problem_description.substring(0, 50)}${request.problem_description.length > 50 ? '...' : ''}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td><button onclick="window.location.href='requests.html'" class="btn btn-sm btn-primary">Просмотр</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    requestsList.innerHTML = html;
}

// Вспомогательные функции
function getStatusClass(status) {
    const map = {
        'new': 'badge-info',
        'in_progress': 'badge-warning',
        'completed': 'badge-success'
    };
    return map[status] || 'badge-secondary';
}

function getStatusText(status) {
    const map = {
        'new': 'Новая',
        'in_progress': 'В процессе',
        'completed': 'Завершена'
    };
    return map[status] || status;
}

// Показать сообщение об ошибке
function showError(message) {
    alert(message); // В реальном проекте сделайте красивый toast
}

// Показать успешное сообщение
function showSuccess(message) {
    alert(message); // В реальном проекте сделайте красивый toast
}