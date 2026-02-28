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
        if (response.status === 401) {
            // Specific handling for session conflict/expiry
            return response.json().then(data => {
                throw new Error(data.message || 'Session expired');
            });
        }
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

        // 3. Withdraw Page Elements (Handled by withdraw.html dedicated logic)
        /*
        const commissionBalance = document.getElementById('commissionBalance');
        if (commissionBalance) commissionBalance.textContent = formatter.format(user.balance || 0);

        const tasksBalance = document.getElementById('tasksBalance');
        if (tasksBalance) tasksBalance.textContent = formatter.format(user.taskBalance || 0);

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
        */

    })
    .catch(error => {
        console.error('Auth check failed:', error);
        
        // Check if it was a session conflict
        if (error.message.includes('Session expired') || error.message.includes('login detected')) {
            // Create and show a custom modal for session conflict
            const sessionOverlay = document.createElement('div');
            sessionOverlay.style.position = 'fixed';
            sessionOverlay.style.inset = '0';
            sessionOverlay.style.background = 'rgba(0,0,0,0.9)';
            sessionOverlay.style.backdropFilter = 'blur(10px)';
            sessionOverlay.style.display = 'flex';
            sessionOverlay.style.alignItems = 'center';
            sessionOverlay.style.justifyContent = 'center';
            sessionOverlay.style.zIndex = '100000';

            const sessionModal = document.createElement('div');
            sessionModal.style.background = '#111';
            sessionModal.style.borderRadius = '24px';
            sessionModal.style.padding = '40px 30px';
            sessionModal.style.width = '90%';
            sessionModal.style.maxWidth = '380px';
            sessionModal.style.textAlign = 'center';
            sessionModal.style.border = '1px solid rgba(212,175,55,0.3)';
            sessionModal.style.boxShadow = '0 25px 50px rgba(0,0,0,0.5)';

            const icon = document.createElement('div');
            icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            icon.style.fontSize = '48px';
            icon.style.color = '#D4AF37';
            icon.style.marginBottom = '20px';

            const title = document.createElement('h3');
            title.textContent = 'Session Expired';
            title.style.color = '#fff';
            title.style.fontSize = '22px';
            title.style.marginBottom = '12px';
            title.style.fontFamily = 'Montserrat, sans-serif';

            const msg = document.createElement('p');
            msg.textContent = 'You have been logged in on another device. For security reasons, this session has been closed.';
            msg.style.color = '#888';
            msg.style.fontSize = '15px';
            msg.style.lineHeight = '1.6';
            msg.style.marginBottom = '30px';

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Back to Login';
            closeBtn.style.width = '100%';
            closeBtn.style.padding = '16px';
            closeBtn.style.borderRadius = '14px';
            closeBtn.style.border = 'none';
            closeBtn.style.background = 'linear-gradient(45deg,#AA771C,#FCF6BA,#D4AF37)';
            closeBtn.style.color = '#000';
            closeBtn.style.fontWeight = '700';
            closeBtn.style.fontSize = '16px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.transition = 'transform 0.2s';
            
            closeBtn.onclick = () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            };

            sessionModal.appendChild(icon);
            sessionModal.appendChild(title);
            sessionModal.appendChild(msg);
            sessionModal.appendChild(closeBtn);
            sessionOverlay.appendChild(sessionModal);
            document.body.appendChild(sessionOverlay);
            
            return; // Don't redirect immediately, let them see the modal
        }
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    document.addEventListener('DOMContentLoaded', () => {
        let logoutModalEl = null;
        let logoutOverlayEl = null;

        function ensureLogoutModal() {
            if (logoutModalEl && logoutOverlayEl) return;

            logoutOverlayEl = document.createElement('div');
            logoutOverlayEl.style.position = 'fixed';
            logoutOverlayEl.style.inset = '0';
            logoutOverlayEl.style.background = 'rgba(0,0,0,0.85)';
            logoutOverlayEl.style.display = 'none';
            logoutOverlayEl.style.alignItems = 'center';
            logoutOverlayEl.style.justifyContent = 'center';
            logoutOverlayEl.style.zIndex = '3000';

            logoutModalEl = document.createElement('div');
            logoutModalEl.style.background = '#111';
            logoutModalEl.style.borderRadius = '16px';
            logoutModalEl.style.padding = '20px';
            logoutModalEl.style.width = '80%';
            logoutModalEl.style.maxWidth = '320px';
            logoutModalEl.style.textAlign = 'center';
            logoutModalEl.style.border = '1px solid rgba(212,175,55,0.4)';
            logoutModalEl.style.color = '#fff';
            logoutModalEl.style.fontFamily = 'inherit';

            const title = document.createElement('h3');
            title.textContent = 'Logout';
            title.style.marginBottom = '10px';
            title.style.fontSize = '1rem';
            title.style.color = '#D4AF37';

            const msg = document.createElement('p');
            msg.textContent = 'Are you sure you want to logout?';
            msg.style.fontSize = '0.85rem';
            msg.style.color = '#aaaaaa';
            msg.style.marginBottom = '18px';

            const btnRow = document.createElement('div');
            btnRow.style.display = 'flex';
            btnRow.style.justifyContent = 'space-between';
            btnRow.style.gap = '10px';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.flex = '1';
            cancelBtn.style.padding = '8px 12px';
            cancelBtn.style.borderRadius = '8px';
            cancelBtn.style.border = '1px solid #333';
            cancelBtn.style.background = '#222';
            cancelBtn.style.color = '#fff';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.onclick = () => {
                if (logoutOverlayEl) logoutOverlayEl.style.display = 'none';
            };

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Logout';
            confirmBtn.style.flex = '1';
            confirmBtn.style.padding = '8px 12px';
            confirmBtn.style.borderRadius = '8px';
            confirmBtn.style.border = 'none';
            confirmBtn.style.background = 'linear-gradient(45deg,#AA771C,#FCF6BA,#D4AF37)';
            confirmBtn.style.color = '#000';
            confirmBtn.style.fontWeight = '700';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.onclick = async () => {
                const token = localStorage.getItem('token');
                if (token) {
                    try {
                        await fetch('/api/auth/logout', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    } catch (err) {
                        console.error('Logout request failed:', err);
                    }
                }
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            };

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(confirmBtn);

            logoutModalEl.appendChild(title);
            logoutModalEl.appendChild(msg);
            logoutModalEl.appendChild(btnRow);

            logoutOverlayEl.appendChild(logoutModalEl);
            logoutOverlayEl.addEventListener('click', e => {
                if (e.target === logoutOverlayEl) {
                    logoutOverlayEl.style.display = 'none';
                }
            });

            document.body.appendChild(logoutOverlayEl);
        }

        function handleLogout(e) {
            e.preventDefault();
            ensureLogoutModal();
            if (logoutOverlayEl) logoutOverlayEl.style.display = 'flex';
        }

        const logoutIds = ['logoutBtn', 'sidebarLogoutBtn'];
        logoutIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', handleLogout);
        });

        const logoutClasses = document.querySelectorAll('.logout-btn');
        logoutClasses.forEach(btn => {
            if (!logoutIds.includes(btn.id)) {
                btn.addEventListener('click', handleLogout);
            }
        });
    });
})();
