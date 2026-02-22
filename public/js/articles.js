document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('articlesContainer');
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const savedAvatar = localStorage.getItem('userAvatar');
    const headerAvatar = document.getElementById('headerAvatar');
    if (savedAvatar && headerAvatar) {
        headerAvatar.src = savedAvatar;
    }

    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.style.display = 'block';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.style.display = 'none';
    }

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', openSidebar);
    }
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    let countdownInterval = null;
    let countdownRemaining = 0;
    let countdownActiveArticleId = null;
    let lastScrollTime = Date.now();

    const pager = document.getElementById('articlesPager');
    const prevBtn = document.getElementById('articlesPrevBtn');
    const nextBtn = document.getElementById('articlesNextBtn');
    const pageInfo = document.getElementById('articlesPageInfo');

    const articlesState = {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0
    };

    const readerOverlay = document.createElement('div');
    readerOverlay.style.position = 'fixed';
    readerOverlay.style.inset = '0';
    readerOverlay.style.background = 'rgba(0,0,0,0.93)';
    readerOverlay.style.display = 'none';
    readerOverlay.style.zIndex = '2100';
    readerOverlay.style.overflowY = 'auto';
    readerOverlay.style.webkitOverflowScrolling = 'touch';

    const readerCard = document.createElement('div');
    readerCard.style.maxWidth = '480px';
    readerCard.style.margin = '40px auto 80px';
    readerCard.style.background = '#050505';
    readerCard.style.borderRadius = '18px';
    readerCard.style.border = '1px solid rgba(212,175,55,0.4)';
    readerCard.style.padding = '14px 14px 60px';
    readerCard.style.position = 'relative';
    readerOverlay.appendChild(readerCard);

    const readerCloseBtn = document.createElement('button');
    readerCloseBtn.textContent = 'Close';
    readerCloseBtn.style.position = 'absolute';
    readerCloseBtn.style.top = '10px';
    readerCloseBtn.style.right = '12px';
    readerCloseBtn.style.borderRadius = '999px';
    readerCloseBtn.style.border = '1px solid #333';
    readerCloseBtn.style.background = '#111';
    readerCloseBtn.style.color = '#f5f5f5';
    readerCloseBtn.style.fontSize = '0.7rem';
    readerCloseBtn.style.padding = '4px 10px';
    readerCard.appendChild(readerCloseBtn);

    const readerTitle = document.createElement('h2');
    readerTitle.style.fontSize = '1rem';
    readerTitle.style.color = '#ffffff';
    readerTitle.style.margin = '4px 0 6px';
    readerCard.appendChild(readerTitle);

    const readerMeta = document.createElement('div');
    readerMeta.style.fontSize = '0.75rem';
    readerMeta.style.color = '#888';
    readerMeta.style.marginBottom = '8px';
    readerCard.appendChild(readerMeta);

    const readerCover = document.createElement('img');
    readerCover.style.width = '100%';
    readerCover.style.maxHeight = '200px';
    readerCover.style.objectFit = 'cover';
    readerCover.style.borderRadius = '12px';
    readerCover.style.border = '1px solid rgba(212,175,55,0.3)';
    readerCover.style.marginBottom = '10px';
    readerCard.appendChild(readerCover);

    const readerBody = document.createElement('div');
    readerBody.style.fontSize = '0.85rem';
    readerBody.style.color = '#f0f0f0';
    readerBody.style.lineHeight = '1.7';
    readerBody.style.marginTop = '6px';
    readerCard.appendChild(readerBody);

    const countdownWidget = document.createElement('div');
    countdownWidget.style.position = 'fixed';
    countdownWidget.style.left = '50%';
    countdownWidget.style.bottom = '80px';
    countdownWidget.style.transform = 'translateX(-50%)';
    countdownWidget.style.background = '#050505';
    countdownWidget.style.borderRadius = '999px';
    countdownWidget.style.border = '1px solid rgba(212,175,55,0.8)';
    countdownWidget.style.padding = '8px 14px';
    countdownWidget.style.display = 'none';
    countdownWidget.style.alignItems = 'center';
    countdownWidget.style.gap = '10px';
    countdownWidget.style.zIndex = '2200';

    const countdownText = document.createElement('span');
    countdownText.style.fontSize = '0.8rem';
    countdownText.style.color = '#f5f5f5';
    countdownWidget.appendChild(countdownText);

    const countdownButton = document.createElement('button');
    countdownButton.textContent = 'Claim';
    countdownButton.style.padding = '6px 12px';
    countdownButton.style.borderRadius = '999px';
    countdownButton.style.border = 'none';
    countdownButton.style.background = 'linear-gradient(135deg, #AA771C 0%, #FCF6BA 40%, #D4AF37 100%)';
    countdownButton.style.color = '#000';
    countdownButton.style.fontSize = '0.8rem';
    countdownButton.style.fontWeight = '600';
    countdownButton.style.cursor = 'pointer';
    countdownButton.disabled = true;
    countdownWidget.appendChild(countdownButton);

    document.body.appendChild(readerOverlay);
    document.body.appendChild(countdownWidget);

    let rewardModalOverlay = null;
    let rewardModalCard = null;
    let rewardModalTitle = null;
    let rewardModalMessage = null;
    let rewardModalCloseBtn = null;

    function ensureRewardModal() {
        if (rewardModalOverlay && rewardModalCard) return;

        rewardModalOverlay = document.createElement('div');
        rewardModalOverlay.style.position = 'fixed';
        rewardModalOverlay.style.inset = '0';
        rewardModalOverlay.style.background = 'rgba(0,0,0,0.9)';
        rewardModalOverlay.style.display = 'none';
        rewardModalOverlay.style.alignItems = 'center';
        rewardModalOverlay.style.justifyContent = 'center';
        rewardModalOverlay.style.zIndex = '2300';

        rewardModalCard = document.createElement('div');
        rewardModalCard.style.background = '#050505';
        rewardModalCard.style.borderRadius = '16px';
        rewardModalCard.style.padding = '20px 18px 16px';
        rewardModalCard.style.width = '80%';
        rewardModalCard.style.maxWidth = '340px';
        rewardModalCard.style.border = '1px solid rgba(212,175,55,0.7)';
        rewardModalCard.style.boxShadow = '0 18px 40px rgba(0,0,0,0.9)';
        rewardModalCard.style.textAlign = 'center';

        rewardModalTitle = document.createElement('h3');
        rewardModalTitle.textContent = 'Reward claimed';
        rewardModalTitle.style.marginBottom = '8px';
        rewardModalTitle.style.fontSize = '1rem';
        rewardModalTitle.style.color = '#FCF6BA';

        rewardModalMessage = document.createElement('p');
        rewardModalMessage.style.fontSize = '0.85rem';
        rewardModalMessage.style.color = '#dddddd';
        rewardModalMessage.style.marginBottom = '14px';

        rewardModalCloseBtn = document.createElement('button');
        rewardModalCloseBtn.textContent = 'Okay';
        rewardModalCloseBtn.style.padding = '8px 16px';
        rewardModalCloseBtn.style.borderRadius = '999px';
        rewardModalCloseBtn.style.border = 'none';
        rewardModalCloseBtn.style.background = 'linear-gradient(135deg, #AA771C 0%, #FCF6BA 40%, #D4AF37 100%)';
        rewardModalCloseBtn.style.color = '#000';
        rewardModalCloseBtn.style.fontSize = '0.85rem';
        rewardModalCloseBtn.style.fontWeight = '600';
        rewardModalCloseBtn.style.cursor = 'pointer';
        rewardModalCloseBtn.onclick = () => {
            if (rewardModalOverlay) rewardModalOverlay.style.display = 'none';
        };

        rewardModalCard.appendChild(rewardModalTitle);
        rewardModalCard.appendChild(rewardModalMessage);
        rewardModalCard.appendChild(rewardModalCloseBtn);

        rewardModalOverlay.appendChild(rewardModalCard);
        rewardModalOverlay.addEventListener('click', e => {
            if (e.target === rewardModalOverlay) {
                rewardModalOverlay.style.display = 'none';
            }
        });

        document.body.appendChild(rewardModalOverlay);
    }

    function showRewardModal(message, opts) {
        ensureRewardModal();
        if (!rewardModalOverlay || !rewardModalTitle || !rewardModalMessage) return;
        const isError = opts && opts.type === 'error';
        rewardModalTitle.textContent = isError ? 'Something went wrong' : 'Reward claimed';
        rewardModalTitle.style.color = isError ? '#ff6b6b' : '#FCF6BA';
        rewardModalMessage.textContent = message || '';
        rewardModalOverlay.style.display = 'flex';
    }

    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        countdownWidget.style.display = 'none';
        countdownActiveArticleId = null;
    }

    function closeReader() {
        stopCountdown();
        readerOverlay.style.display = 'none';
    }

    readerCloseBtn.addEventListener('click', closeReader);
    readerOverlay.addEventListener('click', e => {
        if (e.target === readerOverlay) {
            closeReader();
        }
    });

    function setCountdown(seconds, articleId, rewardAmount) {
        countdownRemaining = seconds;
        countdownActiveArticleId = articleId;
        lastScrollTime = Date.now();
        countdownButton.disabled = true;
        countdownButton.textContent = 'Claim';
        countdownText.textContent = 'Reading... ' + countdownRemaining + 's';
        countdownWidget.style.display = 'flex';

        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        countdownInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastScrollTime > 10000) {
                return;
            }

            if (countdownRemaining > 0) {
                countdownRemaining -= 1;
                countdownText.textContent = 'Reading... ' + countdownRemaining + 's';
            }

            if (countdownRemaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                countdownText.textContent = 'Time complete. Tap claim to earn ₦' + rewardAmount;
                countdownButton.disabled = false;
            }
        }, 1000);
    }

    readerOverlay.addEventListener('scroll', () => {
        lastScrollTime = Date.now();
    }, { passive: true });

    async function openArticle(articleId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const res = await fetch('/api/auth/articles/' + encodeURIComponent(articleId), {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!res.ok) {
                if (res.status === 400 || res.status === 401 || res.status === 403) {
                    applyLogout();
                    return;
                }
                alert('Unable to load article');
                return;
            }

            const data = await res.json();

            readerTitle.textContent = data.title || 'Article';
            const created = data.createdAt ? new Date(data.createdAt) : new Date();
            readerMeta.textContent = created.toLocaleString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            if (data.coverImageUrl) {
                readerCover.src = data.coverImageUrl;
                readerCover.style.display = 'block';
            } else {
                readerCover.style.display = 'none';
            }

            readerBody.innerHTML = data.bodyHtml || '';

            readerOverlay.style.display = 'block';

            stopCountdown();

            if (data.canEarn) {
                setCountdown(60, data.id, data.rewardAmount || 100);
            }
        } catch (e) {
            console.error(e);
            alert('Unable to open article');
        }
    }

    countdownButton.addEventListener('click', async () => {
        if (!countdownActiveArticleId || countdownButton.disabled) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            countdownButton.disabled = true;
            countdownButton.textContent = 'Claiming...';

            const res = await fetch('/api/auth/articles/' + encodeURIComponent(countdownActiveArticleId) + '/claim', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!res.ok) {
                if (res.status === 400 || res.status === 401 || res.status === 403) {
                    applyLogout();
                    return;
                }
                const text = await res.text();
                console.error('Claim failed:', text);
                alert('Unable to claim reward');
                return;
            }

            const data = await res.json();
            const rewardAmount = data.reward || 0;
            showRewardModal('You have earned ₦' + rewardAmount + ' from this article.', { type: 'success' });
            stopCountdown();
        } catch (e) {
            console.error(e);
            showRewardModal('Unable to claim reward. Please try again later.', { type: 'error' });
        }
    });

    async function loadArticles(page) {
        if (!container) return;

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        container.innerHTML = '<div class="article-card"><div class="article-content"><p class="article-excerpt">Loading articles...</p></div></div>';

        try {
            const pageToLoad = page && page > 0 ? page : articlesState.page || 1;
            const params = new URLSearchParams();
            params.set('page', String(pageToLoad));
            params.set('limit', String(articlesState.pageSize));

            const res = await fetch('/api/auth/articles?' + params.toString(), {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!res.ok) {
                if (res.status === 400 || res.status === 401 || res.status === 403) {
                    applyLogout();
                    return;
                }
                throw new Error('Failed to load articles');
            }

            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];

            articlesState.page = data.page || pageToLoad;
            articlesState.pageSize = data.pageSize || articlesState.pageSize;
            articlesState.total = data.total || items.length;
            articlesState.totalPages = data.totalPages || (articlesState.total === 0 ? 0 : Math.ceil(articlesState.total / articlesState.pageSize));

            if (items.length === 0) {
                container.innerHTML = '<p class="article-excerpt" style="text-align:center;">No articles available yet.</p>';
                return;
            }

            container.innerHTML = items.map(a => {
                const cover = a.coverImageUrl || 'https://via.placeholder.com/800x400/050505/FFFFFF?text=Article';
                const desc = a.description || '';
                return (
                    '<div class="article-card" data-id="' + a.id + '">' +
                    '<img src="' + cover + '" alt="Article" class="article-image">' +
                    '<div class="article-content">' +
                    '<span class="article-tag">Article</span>' +
                    '<h3 class="article-title">' + (a.title || '') + '</h3>' +
                    '<p class="article-excerpt">' + desc + '</p>' +
                    '<a href="#" class="read-more">Read Full Article <i class="fas fa-arrow-right"></i></a>' +
                    '</div>' +
                    '</div>'
                );
            }).join('');

            container.addEventListener('click', e => {
                const target = e.target;
                if (!target) return;
                const card = target.closest('.article-card');
                if (!card) return;
                if (!target.classList.contains('read-more') && !target.closest('.read-more')) return;
                e.preventDefault();
                const id = card.getAttribute('data-id');
                if (!id) return;
                openArticle(id);
            });

            if (pageInfo) {
                if (articlesState.totalPages && articlesState.totalPages > 0) {
                    const startIndex = (articlesState.page - 1) * articlesState.pageSize + 1;
                    const endIndex = Math.min(articlesState.page * articlesState.pageSize, articlesState.total);
                    pageInfo.textContent = 'Page ' + articlesState.page + ' • ' + startIndex + '-' + endIndex + ' of ' + articlesState.total;
                } else {
                    pageInfo.textContent = 'Page 1';
                }
            }

            if (prevBtn) {
                prevBtn.disabled = articlesState.page <= 1;
                prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '1';
            }
            if (nextBtn) {
                const totalPages = articlesState.totalPages || 1;
                nextBtn.disabled = articlesState.page >= totalPages;
                nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '1';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="article-excerpt" style="text-align:center;">Failed to load articles.</p>';
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (articlesState.page > 1) {
                loadArticles(articlesState.page - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = articlesState.totalPages || 1;
            if (articlesState.page < totalPages) {
                loadArticles(articlesState.page + 1);
            }
        });
    }

    loadArticles(1);
});
