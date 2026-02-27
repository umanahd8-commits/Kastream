document.addEventListener('DOMContentLoaded', () => {
    // --- SIDEBAR TOGGLE LOGIC (SHARED FOR USER PAGES) ---
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay') || document.getElementById('mainOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function toggleSidebar() {
        if (!sidebar || !overlay) return;
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);

    // Logout Logic handled globally in auth-guard.js

    // --- NOTIFICATION LOGIC ---
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationModal = document.getElementById('notificationModal');
    const closeNotificationModal = document.getElementById('closeNotificationModal');
    const notificationList = document.getElementById('notificationList');
    
    // Create Badge
    const notificationBadge = document.createElement('span');
    notificationBadge.className = 'notification-badge';
    notificationBadge.style.display = 'none'; // Hidden by default

    // Insert badge if notification button exists
    if (notificationBtn && notificationBtn.parentElement) {
        // Wrapper to position badge
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        
        notificationBtn.parentNode.insertBefore(wrapper, notificationBtn);
        wrapper.appendChild(notificationBtn);
        wrapper.appendChild(notificationBadge);
    }

    // Modal Events
    if (notificationBtn && notificationModal) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationModal.classList.add('active'); // Use class instead of style.display
        });
    }

    if (closeNotificationModal && notificationModal) {
        closeNotificationModal.addEventListener('click', () => {
            notificationModal.classList.remove('active');
        });
    }

    if (notificationModal) {
        notificationModal.addEventListener('click', (e) => {
            if (e.target === notificationModal) {
                notificationModal.classList.remove('active');
            }
        });
    }

    // Fetch Notifications
    async function fetchNotifications() {
        const token = localStorage.getItem('token');
        if (!token) return; // Don't fetch if not logged in

        try {
            const response = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const notifications = await response.json();
                renderNotifications(notifications);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            if (notificationList) {
                notificationList.innerHTML = '<div class="notification-item" style="text-align: center; color: var(--text-medium);">Failed to load</div>';
            }
        }
    }

    function renderNotifications(notifications) {
        if (!notificationList) return;

        if (notifications.length === 0) {
            notificationList.innerHTML = '<div class="notification-item" style="text-align: center; color: var(--text-medium);">No new notifications</div>';
            notificationBadge.style.display = 'none';
            return;
        }

        let count = notifications.length;
        if (count > 99) count = '99+';

        notificationBadge.textContent = count;
        notificationBadge.style.display = 'flex';

        notificationList.innerHTML = notifications.map(n => `
            <div class="notification-item">
                <div class="notification-title">
                    ${n.type === 'personal' ? '<i class="fas fa-user-circle" style="color: var(--primary-blue); margin-right: 8px;"></i>' : '<i class="fas fa-bullhorn" style="color: var(--accent-green); margin-right: 8px;"></i>'}
                    ${n.type === 'personal' ? 'Personal Message' : 'Announcement'}
                </div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${new Date(n.date).toLocaleDateString()} ${new Date(n.date).toLocaleTimeString()}</div>
            </div>
        `).join('');
    }

    // Initial Fetch - Only if UI elements exist and NOT on merchants page
    if (notificationBtn && notificationModal && !window.location.pathname.includes('merchants.html')) {
        fetchNotifications();
    }
});
