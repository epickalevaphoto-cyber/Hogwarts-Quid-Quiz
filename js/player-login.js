document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('player-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passcodeInput = document.getElementById('passcode');

    if (!usernameInput || !passcodeInput) {
      alert('Ошибка структуры формы: не найдены поля ввода!');
      return;
    }

    const username = usernameInput.value.trim();
    const passcode = passcodeInput.value.trim();

    if (!username || !passcode) {
      alert('Пожалуйста, заполните логин и пароль.');
      return;
    }

    try {
      const res = await apiRequest('login', { username, passcode });

      if (res.success) {
        if (res.user.role !== 'player') {
          alert('Этот аккаунт принадлежит судье! Перейдите на страницу входа для судьи.');
          return;
        }

        localStorage.setItem('quid_user', JSON.stringify(res.user));
        window.location.href = 'player.html';
      } else {
        alert(res.message || 'Неверный логин или пароль!');
      }
    } catch (err) {
      console.error(err);
      alert('Произошла ошибка при попытке входа. Проверьте соединение.');
    }
  });
});
