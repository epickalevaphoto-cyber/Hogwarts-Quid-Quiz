document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('player-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const passcode = document.getElementById('passcode').value.trim();

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
      alert('Произошла непредвиденная ошибка.');
    }
  });
});
