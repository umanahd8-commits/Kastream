async function getNgnToUsdRate() {
    const cached = sessionStorage.getItem('ngnToUsdRate');
    if (cached) {
        const num = parseFloat(cached);
        if (!Number.isNaN(num) && num > 0) return num;
    }

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/NGN');
        if (!res.ok) throw new Error('Rate request failed');
        const data = await res.json();
        const rate = data && data.rates && data.rates.USD ? Number(data.rates.USD) : null;
        if (!rate || !isFinite(rate) || rate <= 0) throw new Error('Invalid rate');
        sessionStorage.setItem('ngnToUsdRate', String(rate));
        return rate;
    } catch (e) {
        return 1;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let user = null;

    try {
        const response = await fetch('/api/auth/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            user = JSON.parse(userStr);
        } else {
            window.location.href = 'login.html';
            return;
        }
    }

    const isNigeria = user.country === 'NG';
    let displayBalance = user.balance || 0;
    let displayTaskBalance = user.taskBalance || 0;
    let locale = 'en-NG';
    let currency = 'NGN';

    if (!isNigeria) {
        const rate = await getNgnToUsdRate();
        displayBalance = displayBalance * rate;
        displayTaskBalance = displayTaskBalance * rate;
        locale = 'en-US';
        currency = 'USD';
    }

    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });

    const nameEl = document.querySelector('.profile-info h2');
    if (nameEl) {
        const name = user.username || user.fullName || 'User';
        nameEl.textContent = `Hello ${name}`;
    }

    const planEl = document.querySelector('.profile-info p');
    if (planEl) {
        const plan = user.packageType || 'Standard';
        const ref = user.referrer || 'Admin';
        planEl.innerHTML = `Plan: <span class="plus-tag">${plan}</span> • ${ref} Ref`;
    }

    const revenueEl = document.getElementById('revenueAmount');
    if (revenueEl) {
        revenueEl.textContent = formatter.format(displayBalance);
    }

    const taskPayEl = document.getElementById('taskPayAmount');
    if (taskPayEl) {
        taskPayEl.textContent = formatter.format(displayTaskBalance);
    }

    const referralCodeElement = document.querySelector('.referral-link code');
    if (referralCodeElement) {
        const referralLink = `${window.location.origin}/register.html?ref=${user.username}`;
        referralCodeElement.textContent = referralLink;
    }

    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn && referralCodeElement) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(referralCodeElement.textContent);
                alert('Referral link copied to clipboard!');
            } catch (e) {
                alert('Unable to copy link. Please copy manually.');
            }
        });
    }
});
