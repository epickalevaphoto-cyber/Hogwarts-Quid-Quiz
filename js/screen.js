// js/screen.js

document.addEventListener('DOMContentLoaded', () => {
  updateScreen();
  // Опрос Google Таблицы каждые 2 секунды для мгновенного обновления табло зрителей
  setInterval(updateScreen, 2000);
});

async function updateScreen() {
  const res = await apiRequest('get_state');
  if (!res.success) return;

  const state = res.state;
  const chat = res.chat;

  // 1. Обновляем счет и шаги
  const scoreAEl = document.getElementById('score-a');
  const scoreBEl = document.getElementById('score-b');
  const stepEl = document.getElementById('current-step');
  const statusEl = document.getElementById('match-status');

  if (scoreAEl) scoreAEl.textContent = state.team_a_score;
  if (scoreBEl) scoreBEl.textContent = state.team_b_score;
  if (stepEl) stepEl.textContent = state.current_step;
  if (statusEl) {
    statusEl.textContent = state.status === 'in_progress' ? 'ИДЕТ МАТЧ' : 'ПАУЗА / ОЖИДАНИЕ';
  }

  // 2. Статус Снитча
  const snitchBanner = document.getElementById('snitch-banner');
  if (snitchBanner) {
    if (state.snitch_status === 'appeared') {
      snitchBanner.style.display = 'block';
      snitchBanner.style.background = '#f1c40f';
      snitchBanner.style.color = '#000';
      snitchBanner.innerHTML = '⚡ СНИТЧ ПОЯВИЛСЯ НА ПОЛЕ! ⚡';
    } else if (state.snitch_status === 'caught') {
      snitchBanner.style.display = 'block';
      snitchBanner.style.background = '#2ecc71';
      snitchBanner.style.color = '#fff';
      snitchBanner.innerHTML = `🏆 СНИТЧ ПОЙМАН! ПОБЕДИТЕЛЬ: ${state.snitch_winner || 'КОМАНДА'}`;
    } else {
      snitchBanner.style.display = 'none';
    }
  }

  // 3. Сообщения чата
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && chat) {
    chatBox.innerHTML = '';
    chat.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.style.marginBottom = '8px';
      msgDiv.innerHTML = `<span style="color: #f1c40f; font-weight: bold;">[${msg.sender_name}]:</span> ${msg.message}`;
      chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
