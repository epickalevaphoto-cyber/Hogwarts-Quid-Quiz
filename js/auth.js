// js/auth.js

function getCurrentUser() {
  const userData = localStorage.getItem('quid_user');
  return userData ? JSON.parse(userData) : null;
}

function requireAuth(requiredRole = null) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    alert('У вас нет доступа к этой странице!');
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem('quid_user');
  window.location.href = 'index.html';
}
