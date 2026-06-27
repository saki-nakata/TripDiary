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

function refreshCurrentUser() {
  const cur = getCurrentUser();
  if (!cur) return;
  const fresh = getUserById(cur.id);
  if (fresh) setCurrentUser(fresh);
}
