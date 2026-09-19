document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('judge-login-form');
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

      if (!data || data.length === 0 || data[0].role !== 'judge') {
        alert('Неверный логин/пароль судьи!');
        return;
      }

      localStorage.setItem('quid_user', JSON.stringify(data[0]));
      window.location.href = 'judge.html';

    } catch (err) {
      console.error(err);
      alert('Ошибка при подключении к серверу.');
    }
  });
});
