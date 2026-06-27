// ============================================================
// Auth helpers
// ============================================================

function getCurrentUser() {
  const raw = localStorage.getItem('td_current_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('td_current_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('td_current_user');
  window.location.href = 'index.html';
}

function requireAuth() {
  if (!getCurrentUser()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function login(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return null;
  setCurrentUser(user);
  return user;
}

function signup(name, email, password) {
  const users = getUsers();
  if (users.find(u => u.email === email)) return null;
  const newUser = {
    id: 'u' + generateId(),
    name,
    email,
    password,
    bio: '',
    avatar: `https://i.pravatar.cc/150?u=${email}`,
  };
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);
  return newUser;
}

function buildNotifications(userId) {
  const myPosts = getPosts().filter(p => p.userId === userId);
  const myPostIds = myPosts.map(p => p.id);
  const notifs = [];

  getLikes()
    .filter(l => myPostIds.includes(l.postId) && l.userId !== userId)
    .forEach(l => {
      const post = myPosts.find(p => p.id === l.postId);
      notifs.push({ id: `like-${l.userId}-${l.postId}`, type: 'like', fromUserId: l.userId, post, date: l.createdAt || '' });
    });

  getComments()
    .filter(c => myPostIds.includes(c.postId) && c.userId !== userId)
    .forEach(c => {
      const post = myPosts.find(p => p.id === c.postId);
      notifs.push({ id: `comment-${c.id}`, type: 'comment', fromUserId: c.userId, post, body: c.body, date: c.createdAt });
    });

  getFollows()
    .filter(f => f.followingId === userId)
    .forEach(f => {
      notifs.push({ id: `follow-${f.followerId}`, type: 'follow', fromUserId: f.followerId, date: f.createdAt || '' });
    });

  return notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getReadNotifIds() {
  const raw = localStorage.getItem('td_read_notifs');
  return raw ? JSON.parse(raw) : [];
}

function markAllNotifsRead(userId) {
  const ids = buildNotifications(userId).map(n => n.id);
  localStorage.setItem('td_read_notifs', JSON.stringify(ids));
}

function getUnreadNotifCount(userId) {
  const read = getReadNotifIds();
  return buildNotifications(userId).filter(n => !read.includes(n.id)).length;
}

function refreshCurrentUser() {
  const cur = getCurrentUser();
  if (!cur) return;
  const fresh = getUserById(cur.id);
  if (fresh) setCurrentUser(fresh);
}
