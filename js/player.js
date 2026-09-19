let user = null;
let currentChatMode = 'team'; // 'team' или 'global'

document.addEventListener('DOMContentLoaded', () => {
  user = requireAuth('player');
  if (!user) return;

  document.getElementById('player-info').textContent = `${user.username} (${user.team_code === 'team_1' ? 'Команда 1' : 'Команда 2'})`;

  syncPlayer();
  setInterval(syncPlayer, 2000);

  // Отправка ответа на вопрос
  document.getElementById('answer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('answer-input');
    if (input.value.trim()) {
      await apiRequest('send_chat', {
        sender_name: `${user.username} (ОТВЕТ)`,
        message: `ОТВЕТ: ${input.value.trim()}`,
        team_code: 'global' // Ответ идет в общий доступ судье
      });
      input.value = '';
      syncPlayer();
    }
  });

  // Отправка сообщений в чат
  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
      await apiRequest('send_chat', {
        sender_name: `${user.username} (${user.position_name || 'Игрок'})`,
        message: input.value.trim(),
        team_code: currentChatMode === 'team' ? user.team_code : 'global'
      });
      input.value = '';
      syncPlayer();
    }
  });
});

function setChatMode(mode) {
  currentChatMode = mode;
  document.getElementById('btn-team-chat').style.opacity = mode === 'team' ? '1' : '0.5';
  document.getElementById('btn-global-chat').style.opacity = mode === 'global' ? '1' : '0.5';
  syncPlayer();
}

async function syncPlayer() {
  const res = await apiRequest('get_state');
  if (!res.success) return;

  const state = res.state;
  document.getElementById('question-box').textContent = state.current_question || 'Судья пока не задал вопрос';
  document.getElementById('timer-box').textContent = state.timer_seconds;
  
  const isMyTurn = state.current_turn === user.team_code;
  document.getElementById('turn-box').textContent = isMyTurn ? 'ВАША КОМАНДА ХОДИТ!' : 'Ход соперников';
  document.getElementById('turn-box').style.color = isMyTurn ? '#4cd137' : '#e74c3c';

  // Фильтрация чата: показываем либо общий, либо сообщения своей команды
  const chatBox = document.getElementById('chat-messages');
  if (chatBox && res.chat) {
    chatBox.innerHTML = '';
    res.chat.forEach(msg => {
      const isGlobal = msg.team_code === 'global';
      const isMyTeam = msg.team_code === user.team_code;

      if ((currentChatMode === 'global' && isGlobal) || (currentChatMode === 'team' && isMyTeam)) {
        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.innerHTML = `<strong>${msg.sender_name}:</strong> ${msg.message}`;
        chatBox.appendChild(div);
      }
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
