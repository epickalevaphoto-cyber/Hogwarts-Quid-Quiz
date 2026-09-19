document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('player-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameEl = document.getElementById('username');
    const passcodeEl = document.getElementById('passcode');

    if (!usernameEl || !passcodeEl) {
      alert('Ошибка структуры формы: не найдены поля ввода!');
      return;
    }

    const username = usernameEl.value.trim();
    const passcode = passcodeEl.value.trim();

    if (!username || !passcode) {
      alert('Заполните логин и пароль!');
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('players')
        .select('*')
        .eq('username', username)
        .eq('passcode', passcode)
        .maybeSingle();

      if (error) {
        alert('Ошибка базы данных: ' + error.message);
        return;
      }

      if (!data) {
        alert('Неверный логин или пароль игрока!');
        return;
      }

      localStorage.setItem('quid_player', JSON.stringify(data));
      window.location.href = 'player.html';

    } catch (err) {
      console.error(err);
      alert('Произошла непредвиденная ошибка при входе.');
    }
  });
});
