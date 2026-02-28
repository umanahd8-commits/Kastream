function loadAdminFromStorage() {
    let adminInfo = null;
    try {
        const raw = localStorage.getItem('adminInfo');
        if (raw) adminInfo = JSON.parse(raw);
    } catch (err) {}
    return adminInfo || {};
}

function initAdminHeader() {
    const info = loadAdminFromStorage();
    const adminNameEl = document.getElementById('adminName');
    const subtitleEl = document.getElementById('adminSubtitle');
    const chipEl = document.getElementById('adminChip');

    if (adminNameEl) {
        adminNameEl.textContent = info.username || 'Admin';
    }

    if (subtitleEl) {
        if (info.envAdmin) {
            subtitleEl.textContent = 'Signed in as environment admin';
        } else if (info.username) {
            subtitleEl.textContent = 'Signed in as ' + info.username;
        } else {
            subtitleEl.textContent = 'Admin session';
        }
    }

    if (chipEl && info.envAdmin) {
        chipEl.style.borderColor = 'rgba(0,201,111,0.6)';
    }
}

function guardAdminAccess() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Global response status handler for admin
function handleAdminApiResponse(res) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
        applyLogout();
        return false;
    }
    return true;
}

function applyLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    window.location.href = 'login.html';
}

function openSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    if (overlay) overlay.style.display = 'block';
    if (sidebar) sidebar.classList.add('active');
}

function closeSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    if (overlay) overlay.style.display = 'none';
    if (sidebar) sidebar.classList.remove('active');
}

function initSidebarNav() {
    const overlay = document.getElementById('sidebarOverlay');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (overlay) overlay.onclick = closeSidebar;
    if (sidebarCloseBtn) sidebarCloseBtn.onclick = closeSidebar;
    if (hamburgerBtn) hamburgerBtn.onclick = openSidebar;

    const logoutItem = document.getElementById('sidebarLogoutItem');
    if (logoutItem) logoutItem.onclick = () => {
        closeSidebar();
        applyLogout();
    };
}

