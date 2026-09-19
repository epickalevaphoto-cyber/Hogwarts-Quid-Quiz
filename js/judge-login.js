document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('judge-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('judge-username');
    const passcodeInput = document.getElementById('judge-passcode');

    const username = usernameInput ? usernameInput.value.trim() : 'судья';
    const passcode = passcodeInput ? passcodeInput.value.trim() : '';

    try {
      const { data, error } = await window.supabaseClient
        .from('judges')
        .select('*')
        .eq('username', username)
        .eq('passcode', passcode)
        .maybeSingle();

      if (error) {
        alert('Ошибка связи с базой: ' + error.message);
        return;
      }

      if (!data) {
        alert('Неверный логин или пароль судьи!');
        return;
      }

      localStorage.setItem('quid_judge', JSON.stringify(data));
      window.location.href = 'judge.html';

    } catch (err) {
      console.error(err);
      alert('Ошибка при авторизации.');
    }
  });
});
