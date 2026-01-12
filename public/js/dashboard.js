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

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
    });

    // Logout Logic
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
