// ============================================================
// Shared UI helpers
// ============================================================

function buildSidebar(activePage) {
  const user = getCurrentUser();

  const navItems = [
    { href: 'index.html', icon: '🏠', label: 'ホーム', key: 'home' },
    { href: 'search.html', icon: '🔍', label: '検索', key: 'search' },
    { divider: true, authRequired: true },
    { href: 'post-new.html', icon: '✏️', label: '投稿する', key: 'new', authRequired: true },
    { href: `profile.html?id=${user?.id}`, icon: '🌐', label: 'プロフィール', key: 'profile', authRequired: true },
    { divider: true },
    { href: 'mypage.html?tab=wishlist', icon: '🔖', label: '行きたい', key: 'wishlist', authRequired: true },
    { href: 'mypage.html?tab=visited', icon: '✅', label: '訪問済み', key: 'visited', authRequired: true },
    { href: 'mypage.html?tab=myposts', icon: '✈️', label: '自分の投稿', key: 'myposts', authRequired: true },
    { href: 'mypage.html?tab=plans', icon: '🗺️', label: '旅行プラン', key: 'plans', authRequired: true },
    { href: 'mypage.html?tab=follow-feed', icon: '👥', label: 'フォロー中の投稿', key: 'follow-feed', authRequired: true },
  ];

  const navHtml = navItems.map(item => {
    if (item.authRequired && !user) return '';
    if (item.divider) return `<div class="nav-divider"></div>`;
    const active = activePage === item.key ? 'active' : '';
    const countBadge = item.count != null ? `<span class="nav-count">${item.count}</span>` : '';
    return `<a href="${item.href}" class="nav-item ${active}" title="${item.label}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
      ${countBadge}
    </a>`;
  }).join('');

  const bottomSection = user ? (() => {
    const unread = getUnreadNotifCount(user.id);
    const badge = unread ? `<span class="nav-badge">${unread}</span>` : '';
    return `<div class="sidebar-bottom">
      <div class="nav-divider"></div>
      <a href="notification.html" class="nav-item ${activePage === 'notification' ? 'active' : ''}">
        <span class="nav-icon" style="position:relative">🔔${badge}</span>
        <span class="nav-label">通知</span>
      </a>
      <div class="sidebar-user" style="border-top:none;padding-top:0">
        <button class="sidebar-user-trigger" onclick="toggleUserDropdown(event)" aria-label="メニューを開く">
          <img src="${user.avatar}" alt="${user.name}" class="avatar-sm">
          <span class="sidebar-user-name">${user.name}</span>
        </button>
        <div class="sidebar-user-dropdown" id="userDropdown">
          <a href="settings.html" class="sidebar-dropdown-item">プロフィール編集</a>
          <button onclick="logout()" class="sidebar-dropdown-item sidebar-dropdown-logout">ログアウト</button>
        </div>
      </div>
    </div>`;
  })() : `<div class="sidebar-auth">
    <a href="login.html" class="btn btn-primary btn-block">ログイン</a>
    <a href="signup.html" class="btn btn-outline btn-block">新規登録</a>
  </div>`;

  return `<aside class="sidebar">
    <a href="index.html" class="logo">✈️ TripDiary</a>
    <nav class="sidebar-nav">${navHtml}</nav>
    ${bottomSection}
  </aside>`;
}

function buildHeader() {
  const user = getCurrentUser();
  const unread = user ? getUnreadNotifCount(user.id) : 0;

  if (!user) return `<header class="app-header"><div class="app-header-right"></div></header>`;

  const badge = unread ? `<span class="header-notif-badge">${unread}</span>` : '';

  return `<header class="app-header">
    <div class="app-header-right">
      <a href="notification.html" class="header-notif-btn" title="通知">
        🔔${badge}
      </a>
      <div class="header-user">
        <button class="sidebar-user-trigger header-avatar-trigger" onclick="toggleUserDropdown(event)" aria-label="メニューを開く">
          <img src="${user.avatar}" alt="${user.name}" class="avatar-sm">
        </button>
        <div class="sidebar-user-dropdown" id="userDropdown">
          <a href="settings.html" class="sidebar-dropdown-item">プロフィール編集</a>
          <button onclick="logout()" class="sidebar-dropdown-item sidebar-dropdown-logout">ログアウト</button>
        </div>
      </div>
    </div>
  </header>`;
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

  const isOwner = me && me.id === post.userId;

  return `<article class="post-card" onclick="location.href='post-detail.html?id=${post.id}'">
    <div class="post-card-image">
      <img src="${thumb}" alt="${post.title}" loading="lazy">
      ${categoryBadge(post.category)}
      ${photoCount > 1 ? `<span class="photo-count-badge">📷 ${photoCount}</span>` : ''}
      ${isOwner ? `<div class="mypost-actions">
        <a href="post-edit.html?id=${post.id}" class="mypost-action-btn" title="編集" onclick="event.stopPropagation()">✏️</a>
        <button class="mypost-action-btn mypost-delete-btn" title="削除" onclick="event.stopPropagation();deleteOwnPost('${post.id}')">🗑️</button>
      </div>` : ''}
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

function deleteOwnPost(postId) {
  if (!confirm('この投稿を削除しますか？')) return;
  savePosts(getPosts().filter(p => p.id !== postId));
  showToast('投稿を削除しました');
  if (typeof render === 'function') render();
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
  return buildSidebar(activePage)
    + `<div class="main-wrapper"><main class="main-content">${mainHtml}</main></div>`
    + buildBottomNav(activePage);
}
