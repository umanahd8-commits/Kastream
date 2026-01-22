(function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Validate token with server
    fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return response.json();
    })
    .then(user => {
        // Token is valid, update user in localStorage
        localStorage.setItem('user', JSON.stringify(user));
        
        // Common Formatters
        const isNigeria = user.country === 'NG';
        const locale = isNigeria ? 'en-NG' : 'en-US';
        const currency = isNigeria ? 'NGN' : 'USD';
        const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: currency });
        
        // 1. Common UI Elements
        const navUsername = document.getElementById('navUsername');
        if (navUsername) navUsername.textContent = user.username;
        
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) profileBtn.textContent = user.username.charAt(0).toUpperCase();

        const balanceDisplay = document.getElementById('balanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.textContent = formatter.format(user.balance || 0);
        }

        // 2. Profile Page Elements
        const emailDisplay = document.getElementById('emailDisplay');
        if (emailDisplay) emailDisplay.textContent = user.email;

        const phoneDisplay = document.getElementById('phoneDisplay');
        // If phone is missing/null, leave it blank or show empty string as requested
        if (phoneDisplay) phoneDisplay.textContent = user.phone || '';

        const idDisplay = document.getElementById('idDisplay');
        if (idDisplay) idDisplay.textContent = user.id;

        const fullNameDisplay = document.getElementById('fullNameDisplay');
        if (fullNameDisplay) fullNameDisplay.textContent = user.fullName;

        // Profile Card Header Updates
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => el.textContent = user.fullName);

        const userTitleElements = document.querySelectorAll('.user-title');
        userTitleElements.forEach(el => el.textContent = user.packageType + ' Account Holder');

        // 3. Withdraw Page Elements
        const commissionBalance = document.getElementById('commissionBalance');
        if (commissionBalance) commissionBalance.textContent = formatter.format(user.balance || 0);

        const tasksBalance = document.getElementById('tasksBalance');
        if (tasksBalance) tasksBalance.textContent = formatter.format(user.balance || 0);

        const currencySymbol = document.getElementById('currencySymbol');
        if (currencySymbol) {
             const symbol = isNigeria ? '₦' : '$';
             currencySymbol.textContent = symbol;
        }

        const minWithdrawalDisplay = document.getElementById('minWithdrawalDisplay');
        if (minWithdrawalDisplay) {
            const minAmount = isNigeria ? 1000 : 5;
            minWithdrawalDisplay.textContent = `Minimum withdrawal: ${formatter.format(minAmount)}`;
        }

    })
    .catch(error => {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
})();
