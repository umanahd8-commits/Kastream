document.addEventListener('DOMContentLoaded', async () => {
    // Check Authentication
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let user = null;
    
    try {
        // Fetch dashboard-specific data
        const response = await fetch('/api/auth/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            user = await response.json();
            // Update local storage with fresh data (Note: This might be a subset of user data)
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
    const navUsername = document.getElementById('navUsername');
    if (navUsername) navUsername.textContent = user.username;

    const profileImg = document.getElementById('profileImg');
    if (profileImg) profileImg.textContent = user.username.charAt(0).toUpperCase();

    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${user.fullName}!`;
    
    // Format balance
    const isNigeria = user.country === 'NG';
    const locale = isNigeria ? 'en-NG' : 'en-US';
    const currency = isNigeria ? 'NGN' : 'USD';

    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    });
    const balanceDisplay = document.getElementById('balanceDisplay');
    if (balanceDisplay) balanceDisplay.textContent = formatter.format(user.balance || 0);

    const taskBalanceDisplay = document.getElementById('taskBalanceDisplay');
    if (taskBalanceDisplay) taskBalanceDisplay.textContent = formatter.format(user.taskBalance || 0);

    const totalEarningsDisplay = document.getElementById('totalEarningsDisplay');
    if (totalEarningsDisplay) {
        const total = (user.balance || 0) + (user.taskBalance || 0);
        totalEarningsDisplay.textContent = formatter.format(total);
    }

    const dailyEarningsDisplay = document.getElementById('dailyEarningsDisplay');
    if (dailyEarningsDisplay) dailyEarningsDisplay.textContent = formatter.format(user.dailyEarnings || 0);
    
    const tasksDisplay = document.getElementById('tasksDisplay');
    if (tasksDisplay) tasksDisplay.textContent = user.availableTasks || 0;

    const packageDisplay = document.getElementById('packageDisplay');
    if (packageDisplay) packageDisplay.textContent = user.packageType || 'Standard';

    const referrerDisplay = document.getElementById('referrerDisplay');
    if (referrerDisplay) referrerDisplay.textContent = user.referrer || 'None';

    // Generate Dynamic Referral Link
    const referralCodeElement = document.getElementById('referralCode');
    if (referralCodeElement) {
        // Construct link using current origin (handles both localhost and production domain)
        const referralLink = `${window.location.origin}/register.html?ref=${user.username}`;
        referralCodeElement.textContent = referralLink;
    }

    // UI Interactions
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const profileBtn = document.getElementById('profileBtn') || document.getElementById('navProfileLink');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle Sidebar
    function toggleSidebar() {
        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // Toggle Profile Dropdown (Only if dropdown exists and profileBtn is not a direct link)
    if (profileBtn && dropdownMenu && !profileBtn.getAttribute('href')) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
        });
    }

    // Notification Logic
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationModal = document.getElementById('notificationModal');
    const closeNotificationModal = document.getElementById('closeNotificationModal');
    const notificationBadge = document.createElement('span'); // Create badge dynamically if missing
    notificationBadge.className = 'notification-badge';
    notificationBadge.style.display = 'none';
    notificationBadge.style.position = 'absolute';
    notificationBadge.style.top = '-5px';
    notificationBadge.style.right = '-8px';
    notificationBadge.style.background = 'red';
    notificationBadge.style.color = 'white';
    notificationBadge.style.borderRadius = '50%';
    notificationBadge.style.padding = '2px 6px';
    notificationBadge.style.fontSize = '0.7rem';

    if (notificationBtn && notificationBtn.parentElement) {
        notificationBtn.parentElement.style.position = 'relative';
        // Ensure badge is appended to the parent container of the bell icon, not the icon itself (which might be an <i> tag)
        // If the structure is <div class="icon-container"><i id="notificationBtn"></i></div>, we want badge in div.
        // If structure is just <i id="notificationBtn"></i> in header, we need a wrapper or absolute positioning relative to icon.
        // Current HTML structure: <div class="header-icons"><i id="notificationBtn"></i> ... </div>
        // To position correctly relative to the bell, we can wrap the bell in a span or position relative to header-icons but that might be messy.
        // Best approach: Append badge to the parent of notificationBtn (header-icons) but position it relative to the btn.
        // OR: simpler, make the notificationBtn itself relative (if it's a container) or wrap it.
        
        // Let's create a wrapper for the bell icon dynamically to hold both icon and badge
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        
        notificationBtn.parentNode.insertBefore(wrapper, notificationBtn);
        wrapper.appendChild(notificationBtn);
        wrapper.appendChild(notificationBadge);
    }

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
            <div class="notification-item" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 15px 0;">
                <div class="notification-title" style="display: flex; align-items: center; margin-bottom: 5px; font-weight: 600;">
                    ${n.type === 'personal' ? '<i class="fas fa-user-circle" style="color: var(--primary-blue); margin-right: 8px;"></i>' : '<i class="fas fa-bullhorn" style="color: var(--accent-yellow); margin-right: 8px;"></i>'}
                    ${n.type === 'personal' ? 'Personal Message' : 'Announcement'}
                </div>
                <div class="notification-message" style="font-size: 0.9rem; margin-bottom: 5px; color: #ddd;">${n.message}</div>
                <div class="notification-time" style="font-size: 0.7rem; color: var(--text-gray);">${new Date(n.date).toLocaleDateString()} ${new Date(n.date).toLocaleTimeString()}</div>
            </div>
        `).join('');
    }

    if (notificationBtn && notificationModal) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationModal.style.display = 'flex'; // Ensure flex display
            if (dropdownMenu) dropdownMenu.classList.remove('active'); // Close profile if open
        });
    }

    if (closeNotificationModal && notificationModal) {
        closeNotificationModal.addEventListener('click', () => {
            notificationModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside content
    if (notificationModal) {
        notificationModal.addEventListener('click', (e) => {
            if (e.target === notificationModal) {
                notificationModal.style.display = 'none';
            }
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
    });

    // Initial fetch
    fetchNotifications();

    // Logout Logic
    function performLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performLogout();
        });
    }

    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performLogout();
        });
    }
});
