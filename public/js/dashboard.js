document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);

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
