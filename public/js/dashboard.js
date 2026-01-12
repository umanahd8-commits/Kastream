document.addEventListener('DOMContentLoaded', async () => {
    // Check Authentication
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let user = null;
    
    try {
        // Fetch fresh user data
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            user = await response.json();
            // Update local storage with fresh data
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            // Token might be expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Fallback to local storage if network fails
        const userStr = localStorage.getItem('user');
        if (userStr) {
            user = JSON.parse(userStr);
        } else {
            window.location.href = 'login.html';
            return;
        }
    }

    // Populate UI
    document.getElementById('navUsername').textContent = user.username;
    document.getElementById('profileImg').textContent = user.username.charAt(0).toUpperCase();
    document.getElementById('welcomeMsg').textContent = `Welcome back, ${user.fullName}!`;
    
    // Format balance
    const isNigeria = user.country === 'NG';
    const locale = isNigeria ? 'en-NG' : 'en-US';
    const currency = isNigeria ? 'NGN' : 'USD';

    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    });
    document.getElementById('balanceDisplay').textContent = formatter.format(user.balance || 0);
    
    document.getElementById('tasksDisplay').textContent = user.availableTasks || 0;
    document.getElementById('packageDisplay').textContent = user.packageType || 'Standard';
    document.getElementById('referrerDisplay').textContent = user.referrer || 'None';

    // UI Interactions
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const profileBtn = document.getElementById('profileBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle Sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    hamburgerBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Toggle Profile Dropdown
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    // Notification Logic
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationModal = document.getElementById('notificationModal');
    const closeNotificationModal = document.getElementById('closeNotificationModal');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');

    // Fetch Notifications
    async function fetchNotifications() {
        try {
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const notifications = await response.json();
                renderNotifications(notifications);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            notificationList.innerHTML = '<div class="notification-item" style="text-align: center; color: var(--text-medium);">Failed to load</div>';
        }
    }

    function renderNotifications(notifications) {
        if (notifications.length === 0) {
            notificationList.innerHTML = '<div class="notification-item" style="text-align: center; color: var(--text-medium);">No new notifications</div>';
            notificationBadge.style.display = 'none';
            return;
        }

        notificationBadge.textContent = notifications.length;
        notificationBadge.style.display = 'flex';

        notificationList.innerHTML = notifications.map(n => `
            <div class="notification-item">
                <div class="notification-title">
                    ${n.type === 'personal' ? '<i class="fas fa-user-circle" style="color: var(--primary-blue); margin-right: 5px;"></i>' : '<i class="fas fa-bullhorn" style="color: var(--accent-yellow); margin-right: 5px;"></i>'}
                    ${n.type === 'personal' ? 'Personal Message' : 'Announcement'}
                </div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${new Date(n.date).toLocaleDateString()} ${new Date(n.date).toLocaleTimeString()}</div>
            </div>
        `).join('');
    }

    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationModal.classList.add('active');
        dropdownMenu.classList.remove('active'); // Close profile if open
    });

    closeNotificationModal.addEventListener('click', () => {
        notificationModal.classList.remove('active');
    });

    // Close modal when clicking outside content
    notificationModal.addEventListener('click', (e) => {
        if (e.target === notificationModal) {
            notificationModal.classList.remove('active');
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
    });

    // Initial fetch
    fetchNotifications();

    // Logout Logic
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
