// ============================================================
// Shared UI helpers
// ============================================================

function buildSidebar(activePage) {
  const user = getCurrentUser();
  const unreadCount = user ? getUnreadNotifCount(user.id) : 0;
  const navItems = [
    { href: 'index.html', icon: '🏠', label: 'ホーム', key: 'home' },
    { href: 'search.html', icon: '🔍', label: '検索', key: 'search' },
    { href: 'post-new.html', icon: '✏️', label: '投稿する', key: 'new', authRequired: true },
    { divider: true, authRequired: true },
    { href: 'notification.html', icon: '🔔', label: '通知', key: 'notification', authRequired: true, badge: unreadCount },
    { href: 'mypage.html', icon: '📋', label: '管理画面', key: 'mypage', authRequired: true },
    { href: `profile.html?id=${user?.id}`, icon: '🌐', label: '公開プロフィール', key: 'profile', authRequired: true },
  ];

  const navHtml = navItems.map(item => {
    if (item.authRequired && !user) return '';
    if (item.divider) return `<div class="nav-divider"></div>`;
    const active = activePage === item.key ? 'active' : '';
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    return `<a href="${item.href}" class="nav-item ${active}">
      <span class="nav-icon" style="position:relative">${item.icon}${badge}</span>
      <span class="nav-label">${item.label}</span>
    </a>`;
  }).join('');

  const userSection = user
    ? `<div class="sidebar-user">
        <button class="sidebar-user-trigger" onclick="toggleUserDropdown(event)" aria-label="メニューを開く">
          <img src="${user.avatar}" alt="${user.name}" class="avatar-sm">
          <span class="sidebar-user-name">${user.name}</span>
        </button>
        <div class="sidebar-user-dropdown" id="userDropdown">
          <a href="settings.html" class="sidebar-dropdown-item">✏️ プロフィール編集</a>
          <button onclick="logout()" class="sidebar-dropdown-item sidebar-dropdown-logout">ログアウト</button>
        </div>
      </div>`
    : `<div class="sidebar-auth">
        <a href="login.html" class="btn btn-primary btn-block">ログイン</a>
        <a href="signup.html" class="btn btn-outline btn-block">新規登録</a>
      </div>`;

  return `<aside class="sidebar">
    <a href="index.html" class="logo">✈️ TripDiary</a>
    <nav class="sidebar-nav">${navHtml}</nav>
    ${userSection}
  </aside>`;
}

function buildBottomNav(activePage) {
  const user = getCurrentUser();
  const unread = user ? getUnreadNotifCount(user.id) : 0;
  const items = [
    { href: 'index.html', icon: '🏠', label: 'ホーム', key: 'home' },
    { href: 'search.html', icon: '🔍', label: '検索', key: 'search' },
    { href: 'post-new.html', icon: '✏️', label: '投稿', key: 'new', authRequired: true },
    user
      ? { href: 'notification.html', icon: '🔔', label: '通知', key: 'notification', badge: unread }
      : { href: 'login.html', icon: '🔑', label: 'ログイン', key: 'login' },
  ];

  const html = items.map(item => {
    if (item.authRequired && !user) return '';
    const active = activePage === item.key ? 'active' : '';
    const badge = item.badge ? `<span class="bottom-nav-badge">${item.badge}</span>` : '';
    return `<a href="${item.href}" class="bottom-nav-item ${active}">
      <span style="position:relative;display:inline-block">${item.icon}${badge}</span>
      <span>${item.label}</span>
    </a>`;
  }).join('');

  return `<nav class="bottom-nav">${html}</nav>`;
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('userDropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('open');
}

document.addEventListener('click', function() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.remove('open');
});

function buildPostCard(post) {
  const user = getUserById(post.userId);
  const me = getCurrentUser();
  const liked = me ? isLiked(me.id, post.id) : false;
  const likeCount = getLikeCount(post.id);
  const commentCount = getCommentCount(post.id);
  const thumb = post.images && post.images.length > 0 ? post.images[0] : 'https://via.placeholder.com/400x300?text=No+Image';
  const photoCount = post.images ? post.images.length : 0;

  return `<article class="post-card" onclick="location.href='post-detail.html?id=${post.id}'">
    <div class="post-card-image">
      <img src="${thumb}" alt="${post.title}" loading="lazy">
      ${categoryBadge(post.category)}
      ${photoCount > 1 ? `<span class="photo-count-badge">📷 ${photoCount}</span>` : ''}
    </div>
    <div class="post-card-body">
      <div class="post-card-meta">
        <a href="profile.html?id=${user.id}" class="post-author" onclick="event.stopPropagation()">
          <img src="${user.avatar}" alt="${user.name}" class="avatar-xs">
          <span>${user.name}</span>
        </a>
        <a href="tag.html?tag=${encodeURIComponent(post.areaTag)}" class="area-tag" onclick="event.stopPropagation()">
          📍 ${post.areaTag}
        </a>
      </div>
      <h3 class="post-card-title">${post.title}</h3>
      <div class="post-card-stars">${renderStars(post.rating)}</div>
      <div class="post-card-footer">
        <button class="btn-icon like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}" onclick="event.stopPropagation(); handleLike('${post.id}', this)">
          👍 <span class="like-count">${likeCount}</span>
        </button>
        <span class="text-muted">💬 ${commentCount}</span>
        <span class="text-muted visited-date">${formatDate(post.visitedAt)}</span>
      </div>
    </div>
  </article>`;
}

function handleLike(postId, btn) {
  const me = getCurrentUser();
  if (!me) { window.location.href = 'login.html'; return; }
  toggleLike(me.id, postId);
  const liked = isLiked(me.id, postId);
  btn.classList.toggle('liked', liked);
  btn.querySelector('.like-count').textContent = getLikeCount(postId);
}

function buildPostGrid(posts) {
  if (!posts.length) return '<p class="empty-msg">投稿がありません</p>';
  return `<div class="post-grid">${posts.map(buildPostCard).join('')}</div>`;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

function buildLayout(activePage, mainHtml) {
  return buildSidebar(activePage) + `<main class="main-content">${mainHtml}</main>` + buildBottomNav(activePage);
}
