document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('player-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const passcode = document.getElementById('passcode').value.trim();

    try {
      const { data, error } = await window.supabaseClient.rpc('login_user', {
        p_username: username,
        p_passcode: passcode
      });

      if (error) {
        alert('Ошибка авторизации: ' + error.message);
        return;
      }

      if (!data || data.length === 0 || data[0].role !== 'player') {
        alert('Неверный логин или пароль игрока!');
        return;
      }

      localStorage.setItem('quid_user', JSON.stringify(data[0]));
      window.location.href = 'player.html';

    } catch (err) {
      console.error(err);
      alert('Ошибка при подключении к серверу.');
    }
  });
});
