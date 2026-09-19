document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('judge-login-form');
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
        if (res.user.role !== 'judge') {
          alert('Этот аккаунт принадлежит игроку! Выберите форму входа для игроков.');
          return;
        }

        localStorage.setItem('quid_user', JSON.stringify(res.user));
        window.location.href = 'judge.html';
      } else {
        alert(res.message || 'Неверный логин или пароль судьи!');
      }
    } catch (err) {
      console.error(err);
      alert('Произошла ошибка при попытке входа. Проверьте соединение.');
    }
  });
});
